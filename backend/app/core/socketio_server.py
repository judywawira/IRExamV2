"""
Socket.IO Server for Real-Time Synchronization
Implements server-authoritative state model
"""
import socketio
from datetime import datetime
from typing import Dict, Optional
from jose import JWTError, jwt

from app.core.config import settings
from app.models.session import Session
from app.models.user import User


# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=settings.CORS_ORIGINS,
    logger=True,
    engineio_logger=True
)

# In-memory session state cache for fast access
session_cache: Dict[str, Dict] = {}


async def verify_token(token: str) -> Optional[User]:
    """Verify JWT token and return user"""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            return None

        user = await User.find_one(User.email == email)
        return user
    except JWTError:
        return None


@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    print(f"🔌 Client connected: {sid}")

    # Verify authentication
    if not auth or 'token' not in auth:
        await sio.disconnect(sid)
        print(f"❌ Unauthorized connection attempt: {sid}")
        return False

    user = await verify_token(auth['token'])
    if not user or user.is_archived or not user.is_approved:
        await sio.disconnect(sid)
        print(f"❌ Invalid user or unapproved: {sid}")
        return False

    # Store user info in session
    await sio.save_session(sid, {
        'user_id': str(user.id),
        'email': user.email,
        'role': user.role
    })

    print(f"✅ User authenticated: {user.email} ({user.role})")
    return True


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    session_data = await sio.get_session(sid)
    if session_data:
        print(f"🔌 Client disconnected: {session_data.get('email')} ({sid})")
    else:
        print(f"🔌 Client disconnected: {sid}")


def get_link_id(obj):
    """Helper to safely extract ID from Beanie Link or object"""
    if hasattr(obj, 'ref'):
        return str(obj.ref.id)
    elif hasattr(obj, 'id'):
        return str(obj.id)
    else:
        return str(obj)


@sio.event
async def join_room(sid, data):
    """Join a session room"""
    session_data = await sio.get_session(sid)
    if not session_data:
        return {'error': 'Unauthorized'}

    session_id = data.get('session_id')
    if not session_id:
        return {'error': 'session_id required'}

    # Verify user has access to this session
    session = await Session.get(session_id)
    if not session:
        print(f"❌ join_room: Session not found: {session_id}")
        return {'error': 'Session not found'}

    user_id = session_data['user_id']
    user_role = session_data['role']

    # Check authorization
    if user_role == 'student':
        # Students must be assigned to the session
        student_ids = [get_link_id(s) for s in session.students]
        if user_id not in student_ids:
            return {'error': 'Not authorized for this session'}
    elif user_role == 'examiner':
        # Must be the session examiner
        if get_link_id(session.examiner) != user_id:
            return {'error': 'Not authorized for this session'}

    # Join the room
    room_name = f"session_{session_id}"
    await sio.enter_room(sid, room_name)

    # Update participants list
    if user_id not in session.participants_online:
        session.participants_online.append(user_id)
        await session.save()

    # Emit to room that user joined
    await sio.emit('user_joined', {
        'user_id': user_id,
        'email': session_data['email'],
        'role': user_role
    }, room=room_name, skip_sid=sid)

    print(f"✅ {session_data['email']} joined room: {room_name}")

    return {'success': True, 'room': room_name}


@sio.event
async def request_sync(sid, data):
    """Send current session state to requesting client"""
    session_id = data.get('session_id')
    if not session_id:
        return {'error': 'session_id required'}

    session = await Session.get(session_id)
    if not session:
        print(f"❌ request_sync: Session not found: {session_id}")
        return {'error': 'Session not found'}

    # Fetch full exam data
    await session.fetch_all_links()
    exam = session.exam

    # Calculate time elapsed
    time_elapsed = session.get_current_time_elapsed()

    # Build snapshot
    snapshot = {
        'session_id': str(session.id),
        'status': session.status,
        'current_case_index': session.current_case_index,
        'current_image_index': session.current_image_index,
        'time_elapsed': time_elapsed,
        'duration_minutes': exam.duration_minutes,
        'is_paused': session.status == 'paused',
        'participants_online': session.participants_online,
        'server_time': datetime.utcnow().isoformat()
    }

    # Emit snapshot only to requesting client
    await sio.emit('session_snapshot', snapshot, room=sid)

    print(f"📸 Snapshot sent to {sid}: Case {session.current_case_index}, Image {session.current_image_index}")


@sio.event
async def cmd_start(sid, data):
    """Start exam session (examiner only)"""
    session_data = await sio.get_session(sid)
    if not session_data or session_data['role'] not in ['examiner', 'admin']:
        return {'error': 'Unauthorized'}

    session_id = data.get('session_id')
    if not session_id:
        print(f"❌ cmd_start: No session_id provided")
        return {'error': 'session_id required'}

    print(f"🔍 cmd_start: Looking up session {session_id}")
    session = await Session.get(session_id)
    if not session:
        print(f"❌ cmd_start: Session not found: {session_id}")
        return {'error': 'Session not found'}

    print(f"✅ cmd_start: Session found: {session_id}, status: {session.status}")

    # Start the session
    session.status = 'active'
    session.actual_start = datetime.utcnow()
    session.updated_at = datetime.utcnow()
    await session.save()

    # Broadcast to all participants
    room_name = f"session_{session_id}"
    await sio.emit('state_change', {
        'key': 'status',
        'value': 'active',
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_name)

    print(f"▶️ Exam started: {session_id}")
    return {'success': True}


@sio.event
async def cmd_pause(sid, data):
    """Pause exam session (examiner only)"""
    session_data = await sio.get_session(sid)
    if not session_data or session_data['role'] not in ['examiner', 'admin']:
        return {'error': 'Unauthorized'}

    session_id = data.get('session_id')
    session = await Session.get(session_id)
    if not session:
        print(f"❌ cmd_pause: Session not found: {session_id}")
        return {'error': 'Session not found'}

    session.status = 'paused'
    session.paused_at = datetime.utcnow()
    session.updated_at = datetime.utcnow()
    await session.save()

    room_name = f"session_{session_id}"
    await sio.emit('state_change', {
        'key': 'status',
        'value': 'paused',
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_name)

    print(f"⏸️ Exam paused: {session_id}")
    return {'success': True}


@sio.event
async def cmd_resume(sid, data):
    """Resume exam session (examiner only)"""
    session_data = await sio.get_session(sid)
    if not session_data or session_data['role'] not in ['examiner', 'admin']:
        return {'error': 'Unauthorized'}

    session_id = data.get('session_id')
    session = await Session.get(session_id)
    if not session:
        print(f"❌ cmd_resume: Session not found: {session_id}")
        return {'error': 'Session not found'}
    if session.status != 'paused':
        return {'error': 'Cannot resume'}

    # Calculate pause duration
    if session.paused_at:
        pause_duration = int((datetime.utcnow() - session.paused_at).total_seconds())
        session.total_pause_duration += pause_duration

    session.status = 'active'
    session.resumed_at = datetime.utcnow()
    session.paused_at = None
    session.updated_at = datetime.utcnow()
    await session.save()

    room_name = f"session_{session_id}"
    await sio.emit('state_change', {
        'key': 'status',
        'value': 'active',
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_name)

    print(f"▶️ Exam resumed: {session_id}")
    return {'success': True}


@sio.event
async def cmd_nav(sid, data):
    """Navigate to image (examiner only)"""
    session_data = await sio.get_session(sid)
    if not session_data or session_data['role'] not in ['examiner', 'admin']:
        return {'error': 'Unauthorized'}

    session_id = data.get('session_id')
    case_idx = data.get('case_index')
    img_idx = data.get('image_index')

    if case_idx is None or img_idx is None:
        return {'error': 'case_index and image_index required'}

    session = await Session.get(session_id)
    if not session:
        print(f"❌ cmd_nav: Session not found: {session_id}")
        return {'error': 'Session not found'}

    # Update navigation state
    session.current_case_index = case_idx
    session.current_image_index = img_idx
    session.updated_at = datetime.utcnow()
    await session.save()

    # Broadcast to all participants
    room_name = f"session_{session_id}"
    await sio.emit('nav_update', {
        'case_index': case_idx,
        'image_index': img_idx,
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_name)

    print(f"🖼️ Navigation: Case {case_idx}, Image {img_idx}")
    return {'success': True}


@sio.event
async def cmd_end(sid, data):
    """End exam session (examiner only)"""
    session_data = await sio.get_session(sid)
    if not session_data or session_data['role'] not in ['examiner', 'admin']:
        return {'error': 'Unauthorized'}

    session_id = data.get('session_id')
    session = await Session.get(session_id)
    if not session:
        print(f"❌ cmd_end: Session not found: {session_id}")
        return {'error': 'Session not found'}

    session.status = 'completed'
    session.ended_at = datetime.utcnow()
    session.updated_at = datetime.utcnow()
    await session.save()

    room_name = f"session_{session_id}"
    await sio.emit('state_change', {
        'key': 'status',
        'value': 'completed',
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_name)

    print(f"🏁 Exam ended: {session_id}")
    return {'success': True}


@sio.event
async def cmd_annotate(sid, data):
    """Add annotation (examiner only)"""
    session_data = await sio.get_session(sid)
    if not session_data or session_data['role'] not in ['examiner', 'admin']:
        return {'error': 'Unauthorized'}

    session_id = data.get('session_id')
    annotation_data = data.get('data')

    if not annotation_data:
        return {'error': 'annotation data required'}

    # Broadcast annotation to all participants
    room_name = f"session_{session_id}"
    await sio.emit('annotation_stream', {
        'operation': 'add',
        'data': annotation_data,
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_name)

    print(f"✏️ Annotation added")
    return {'success': True}


@sio.event
async def cmd_clear_annotations(sid, data):
    """Clear all annotations (examiner only)"""
    session_data = await sio.get_session(sid)
    if not session_data or session_data['role'] not in ['examiner', 'admin']:
        return {'error': 'Unauthorized'}

    session_id = data.get('session_id')

    room_name = f"session_{session_id}"
    await sio.emit('annotation_stream', {
        'operation': 'clear',
        'timestamp': datetime.utcnow().isoformat()
    }, room=room_name)

    print(f"🧹 Annotations cleared")
    return {'success': True}


# Heartbeat for timer synchronization (runs every 30 seconds)
async def timer_heartbeat_task():
    """Background task to send timer sync every 30 seconds"""
    import asyncio

    while True:
        await asyncio.sleep(30)

        # Find all active sessions
        active_sessions = await Session.find(Session.status == 'active').to_list()

        for session in active_sessions:
            time_elapsed = session.get_current_time_elapsed()
            await session.fetch_all_links()

            # Only send timer sync if exam has a duration limit
            if session.exam.duration_minutes:
                duration_seconds = session.exam.duration_minutes * 60
                seconds_remaining = max(0, duration_seconds - time_elapsed)

                room_name = f"session_{str(session.id)}"
                await sio.emit('timer_sync', {
                    'seconds_remaining': seconds_remaining,
                    'time_elapsed': time_elapsed
                }, room=room_name)


# Start heartbeat task when server starts
@sio.event
async def server_ready():
    """Start background tasks"""
    import asyncio
    asyncio.create_task(timer_heartbeat_task())
