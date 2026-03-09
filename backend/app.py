from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from pymongo import MongoClient
from datetime import timedelta, datetime
import bcrypt
import os
import smtplib
import threading
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from fpdf import FPDF
from dotenv import load_dotenv
import tempfile

from curriculum_generator import generate_curriculum

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"])

# JWT Configuration
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "fallback-secret-key")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
jwt = JWTManager(app)

# MongoDB Connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/curricuforge")
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.server_info()
    db = client["curricuforge"]
    users_collection = db["users"]
    curricula_collection = db["curricula"]
    otp_collection = db["otps"] # New collection for forgot password OTPs
    progress_collection = db["progress"] # New collection for student progress
    print("✅ Connected to MongoDB successfully!")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    db = None
    users_collection = None
    curricula_collection = None
    otp_collection = None
    progress_collection = None


def get_current_user():
    """Helper to fetch full user doc from JWT identity."""
    from bson import ObjectId
    user_id = get_jwt_identity()
    if users_collection is None:
        return None
    return users_collection.find_one({"_id": ObjectId(user_id)})


def require_role(role: str):
    """Return error response if current user doesn't have the required role."""
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.get("role") != role:
        return jsonify({"error": f"Access denied. {role.capitalize()} role required."}), 403
    return None


def send_email_async(subject, body, recipient_emails, attachment_path=None, attachment_filename=None):
    """Background task to send emails using SMTP, now with attachment support."""
    smtp_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    smtp_port   = int(os.getenv("MAIL_PORT", "587"))
    sender_email = os.getenv("MAIL_USERNAME", "")
    sender_password = os.getenv("MAIL_PASSWORD", "")

    if not sender_email or not sender_password:
        print("📧 Email skipped: MAIL_USERNAME or MAIL_PASSWORD not configured.")
        return

    try:
        print(f"📧 Attempting to send emails to {len(recipient_emails)} recipients...")
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)

        for recipient in recipient_emails:
            msg = MIMEMultipart()
            msg["From"] = f"CurricuForge <{sender_email}>"
            msg["To"] = recipient
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "html"))
            
            if attachment_path and os.path.exists(attachment_path):
                with open(attachment_path, "rb") as f:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header("Content-Disposition", f"attachment; filename={attachment_filename}")
                    msg.attach(part)
            
            server.send_message(msg)
        
        server.quit()
        print(f"✅ Successfully sent emails.")
        
        # Cleanup attachment if it was a temp file
        if attachment_path and "temp" in attachment_path:
            try: os.remove(attachment_path)
            except: pass
            
    except Exception as e:
        print(f"❌ Failed to send emails: {e}")


def generate_certificate_pdf(student_name, course_name, date, certificate_id):
    """Generates a professional certificate PDF using FPDF."""
    pdf = FPDF(orientation="landscape", unit="mm", format="A4")
    pdf.add_page()
    
    # Border
    pdf.set_line_width(2)
    pdf.set_draw_color(124, 58, 237) # Purple
    pdf.rect(10, 10, 277, 190)
    
    pdf.set_line_width(0.5)
    pdf.rect(13, 13, 271, 184)

    # Title
    pdf.set_font("helvetica", "B", 40)
    pdf.set_text_color(31, 41, 55) # Dark gray
    pdf.set_y(40)
    pdf.cell(0, 20, "CERTIFICATE", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "", 14)
    pdf.set_text_color(107, 114, 128) # Gray
    pdf.cell(0, 10, "OF COMPLETION", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(20)

    # Content
    pdf.set_font("helvetica", "I", 16)
    pdf.set_text_color(31, 41, 55)
    pdf.cell(0, 10, "This is to certify that", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    pdf.set_font("helvetica", "B", 32)
    pdf.set_text_color(124, 58, 237) # Purple
    pdf.cell(0, 15, student_name.upper().encode('latin-1', 'replace').decode('latin-1'), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    pdf.set_font("helvetica", "I", 16)
    pdf.set_text_color(31, 41, 55)
    pdf.cell(0, 10, "has successfully completed the course", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    pdf.set_font("helvetica", "B", 24)
    pdf.set_text_color(31, 41, 55)
    pdf.cell(0, 15, course_name.encode('latin-1', 'replace').decode('latin-1'), align="C", new_x="LMARGIN", new_y="NEXT")
    
    # Footer info
    pdf.set_y(160)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(90, 10, date, align="C")
    pdf.cell(90, 10, "", align="C")
    pdf.cell(90, 10, "CurricuForge AI", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("helvetica", "", 8)
    pdf.set_text_color(156, 163, 175)
    pdf.cell(90, 5, "DATE", align="C")
    pdf.cell(90, 5, "", align="C")
    pdf.cell(90, 5, "ISSUER", align="C", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_y(185)
    pdf.cell(0, 10, f"Certificate ID: {certificate_id}", align="C")

    # Save to temp file
    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    pdf.output(path)
    return path


def notify_students_of_new_curriculum(course_title, course_id, content_preview):
    """Triggers background email sending to all students."""
    if users_collection is None: return

    # 1. Get all student emails
    students = list(users_collection.find({"role": "student"}, {"email": 1}))
    emails = [s["email"] for s in students if "email" in s]

    if not emails:
        print("📧 No students found to notify.")
        return

    # 2. Prepare email content
    # For local testing, link points to localhost
    app_url = "http://localhost:5173" 
    subject = f"📚 New Course Published: {course_title}"
    
    body = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #7c3aed;">Hello Student!</h2>
        <p>A new curriculum has just been published on <strong>CurricuForge</strong>.</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">{course_title}</h3>
            <p style="color: #666;">{content_preview[:200]}...</p>
            <a href="{app_url}/student/curriculum/{course_id}" 
               style="background: #7c3aed; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
               View Full Curriculum
            </a>
        </div>
        <p>Happy Learning!<br/>The CurricuForge Team</p>
    </div>
    """

    # 3. Start background thread
    thread = threading.Thread(target=send_email_async, args=(subject, body, emails))
    thread.start()


# ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    if users_collection is None:
        return jsonify({"error": "Database not connected"}), 503

    data = request.get_json()
    name     = data.get("name", "").strip()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role     = data.get("role", "student").strip().lower()

    if not name or not email or not password:
        return jsonify({"error": "All fields are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if role not in ("student", "faculty"):
        return jsonify({"error": "Role must be 'student' or 'faculty'"}), 400
    if users_collection.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    user = {
        "name": name,
        "email": email,
        "password": hashed_pw,
        "role": role,
        "created_at": datetime.utcnow()
    }
    result = users_collection.insert_one(user)
    access_token = create_access_token(identity=str(result.inserted_id))

    return jsonify({
        "message": "Registration successful",
        "token": access_token,
        "user": {"id": str(result.inserted_id), "name": name, "email": email, "role": role}
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    if users_collection is None:
        return jsonify({"error": "Database not connected"}), 503

    data = request.get_json()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role     = data.get("role", "").strip().lower()   # optional role check

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = users_collection.find_one({"email": email})
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    # If role supplied, verify it matches
    if role and user.get("role") != role:
        return jsonify({"error": f"This account is not registered as {role}"}), 403

    access_token = create_access_token(identity=str(user["_id"]))
    return jsonify({
        "message": "Login successful",
        "token": access_token,
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "student")
        }
    }), 200


@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    if users_collection is None or otp_collection is None:
        return jsonify({"error": "Database not connected"}), 503

    data = request.get_json()
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = users_collection.find_one({"email": email})
    if not user:
        # For security, we might want to say "Check your email" even if user doesn't exist,
        # but for this app we'll be direct.
        return jsonify({"error": "No account found with this email"}), 404

    # 1. Generate 6-digit OTP
    otp = "".join(random.choices(string.digits, k=6))
    
    # 2. Store in DB with 10-min expiry
    otp_collection.update_one(
        {"email": email},
        {
            "$set": {
                "otp": otp,
                "created_at": datetime.utcnow(),
                "expires_at": datetime.utcnow() + timedelta(minutes=10)
            }
        },
        upsert=True
    )

    # 3. Send Email
    subject = "🔑 Password Reset OTP - CurricuForge"
    body = f"""
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; text-align: center;">
        <h2 style="color: #7c3aed;">Password Reset</h2>
        <p>You requested a password reset. Use the code below to proceed:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px auto; width: 200px; font-size: 1.5rem; font-weight: bold; letter-spacing: 4px; color: #7c3aed; border: 1px solid #7c3aed;">
            {otp}
        </div>
        <p style="color: #666; font-size: 0.85rem;">This code expires in 10 minutes.<br/>If you didn't request this, please ignore this email.</p>
    </div>
    """
    
    thread = threading.Thread(target=send_email_async, args=(subject, body, [email]))
    thread.start()

    return jsonify({"message": "OTP sent to your email"}), 200


@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    if users_collection is None or otp_collection is None:
        return jsonify({"error": "Database not connected"}), 503

    data = request.get_json()
    email    = data.get("email", "").strip().lower()
    otp      = data.get("otp", "").strip()
    new_password = data.get("password", "")

    if not email or not otp or not new_password:
        return jsonify({"error": "All fields are required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    # 1. Validate OTP
    record = otp_collection.find_one({"email": email})
    if not record or record["otp"] != otp:
        return jsonify({"error": "Invalid or missing OTP"}), 400
    
    if datetime.utcnow() > record["expires_at"]:
        return jsonify({"error": "OTP has expired"}), 400

    # 2. Update Password
    hashed_pw = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
    users_collection.update_one({"email": email}, {"$set": {"password": hashed_pw}})

    # 3. Clear OTP
    otp_collection.delete_one({"email": email})

    return jsonify({"message": "Password reset successfully. You can now login."}), 200


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user.get("role", "student")
        }
    }), 200


# ─── FACULTY: CURRICULUM ROUTES ───────────────────────────────────────────────

@app.route("/api/curriculum/generate", methods=["POST"])
@jwt_required()
def generate():
    from bson import ObjectId
    err = require_role("faculty")
    if err:
        return err

    user_id = get_jwt_identity()
    data = request.get_json()
    subject     = data.get("subject", "").strip()
    duration    = data.get("duration", "").strip()
    level       = data.get("level", "Beginner").strip()
    description = data.get("description", "").strip()
    objectives  = data.get("objectives", "").strip()
    youtube_url = data.get("youtube_url", "").strip()

    if not subject or not duration:
        return jsonify({"error": "Subject and duration are required"}), 400

    result = generate_curriculum(subject, duration, level, description, objectives)
    if result.get("error"):
        return jsonify({"error": result["error"]}), 500

    curriculum_doc = {
        "user_id":     ObjectId(user_id),
        "subject":     subject,
        "duration":    duration,
        "level":       level,
        "description": description,
        "objectives":  objectives,
        "youtube_url": youtube_url,
        "curriculum":  result["curriculum"],
        "modules":     [], # AI generated starts with no manual modules
        "type":        "ai",
        "published":   False,
        "created_at":  datetime.utcnow(),
        "published_at": None,
    }

    if curricula_collection is not None:
        inserted = curricula_collection.insert_one(curriculum_doc)
        doc_id = str(inserted.inserted_id)
    else:
        doc_id = ""

    return jsonify({
        "message": "Curriculum generated successfully",
        "curriculum": result["curriculum"],
        "id": doc_id,
        "demo": result.get("demo", False)
    }), 200


@app.route("/api/curriculum/add", methods=["POST"])
@jwt_required()
def add_manual_course():
    from bson import ObjectId
    err = require_role("faculty")
    if err:
        return err

    user_id = get_jwt_identity()
    data = request.get_json()
    subject     = data.get("subject", "").strip()
    duration    = data.get("duration", "").strip()
    level       = data.get("level", "Beginner").strip()
    description = data.get("description", "").strip()
    youtube_url = data.get("youtube_url", "").strip()
    content     = data.get("content", "").strip() # Manual text content

    if not subject:
        return jsonify({"error": "Subject is required"}), 400

    curriculum_doc = {
        "user_id":     ObjectId(user_id),
        "subject":     subject,
        "duration":    duration or "N/A",
        "level":       level,
        "description": description,
        "youtube_url": youtube_url,
        "curriculum":  content or f"### {subject}\n\nThis is a manually added course.",
        "modules":     data.get("modules", []), # Added modules support
        "type":        "manual",
        "published":   True, # Auto-publish manual courses? Or keep hidden? I'll set to True for ease.
        "created_at":  datetime.utcnow(),
        "published_at": datetime.utcnow(),
    }

    if curricula_collection is not None:
        inserted = curricula_collection.insert_one(curriculum_doc)
        doc_id = str(inserted.inserted_id)

        # Notify students of the new manual course (since it's auto-published)
        notify_students_of_new_curriculum(
            course_title=subject,
            course_id=doc_id,
            content_preview=description or "A new course has been added."
        )

        return jsonify({
            "message": "Course added successfully",
            "id": doc_id
        }), 201
    
    return jsonify({"error": "Database error"}), 500


@app.route("/api/curriculum/history", methods=["GET"])
@jwt_required()
def get_history():
    from bson import ObjectId
    err = require_role("faculty")
    if err:
        return err

    user_id = get_jwt_identity()
    if curricula_collection is None:
        return jsonify({"curricula": []}), 200

    curricula = list(
        curricula_collection.find(
            {"user_id": ObjectId(user_id)},
            {"curriculum": 0}
        ).sort("created_at", -1).limit(30)
    )
    for c in curricula:
        c["_id"]        = str(c["_id"])
        c["user_id"]    = str(c["user_id"])
        c["type"]       = c.get("type", "ai") # Default to AI for older records
        c["created_at"] = c["created_at"].isoformat()
        if c.get("published_at"):
            c["published_at"] = c["published_at"].isoformat()

    return jsonify({"curricula": curricula}), 200


@app.route("/api/curriculum/<curriculum_id>", methods=["GET"])
@jwt_required()
def get_curriculum(curriculum_id):
    from bson import ObjectId
    user    = get_current_user()
    user_id = get_jwt_identity()
    role    = user.get("role", "student") if user else "student"

    if curricula_collection is None:
        return jsonify({"error": "Database not connected"}), 503

    try:
        oid = ObjectId(curriculum_id)
    except Exception:
        return jsonify({"error": "Invalid curriculum ID"}), 400

    if role == "faculty":
        # Faculty can only see their own
        curriculum = curricula_collection.find_one({"_id": oid, "user_id": ObjectId(user_id)})
    else:
        # Students can only see published
        curriculum = curricula_collection.find_one({"_id": oid, "published": True})

    if not curriculum:
        return jsonify({"error": "Curriculum not found"}), 404

    curriculum["_id"]        = str(curriculum["_id"])
    curriculum["user_id"]    = str(curriculum["user_id"])
    curriculum["created_at"] = curriculum["created_at"].isoformat()
    if curriculum.get("published_at"):
        curriculum["published_at"] = curriculum["published_at"].isoformat()

    curriculum["modules"] = curriculum.get("modules", [])
    curriculum["type"]    = curriculum.get("type", "ai")

    return jsonify({"curriculum": curriculum}), 200


@app.route("/api/curriculum/<curriculum_id>/publish", methods=["PATCH"])
@jwt_required()
def publish_curriculum(curriculum_id):
    from bson import ObjectId
    err = require_role("faculty")
    if err:
        return err

    user_id = get_jwt_identity()
    if curricula_collection is None:
        return jsonify({"error": "Database not connected"}), 503

    data = request.get_json() or {}
    publish = data.get("publish", True)

    try:
        oid = ObjectId(curriculum_id)
    except Exception:
        return jsonify({"error": "Invalid curriculum ID"}), 400

    update = {
        "$set": {
            "published": bool(publish),
            "published_at": datetime.utcnow() if publish else None
        }
    }
    result = curricula_collection.update_one(
        {"_id": oid, "user_id": ObjectId(user_id)},
        update
    )
    if result.matched_count == 0:
        return jsonify({"error": "Curriculum not found"}), 404

    # Trigger email notification if publishing
    if publish:
        curr = curricula_collection.find_one({"_id": oid})
        if curr:
            notify_students_of_new_curriculum(
                course_title=curr.get("subject", "New Course"),
                course_id=str(oid),
                content_preview=curr.get("description", "New learning material available.")
            )

    action = "published" if publish else "unpublished"
    return jsonify({"message": f"Curriculum {action} successfully", "published": bool(publish)}), 200


@app.route("/api/curriculum/<curriculum_id>/modules", methods=["POST"])
@jwt_required()
def update_modules(curriculum_id):
    from bson import ObjectId
    err = require_role("faculty")
    if err:
        return err

    user_id = get_jwt_identity()
    if curricula_collection is None:
        return jsonify({"error": "Database not connected"}), 503

    data = request.get_json()
    modules = data.get("modules", [])

    try:
        oid = ObjectId(curriculum_id)
    except Exception:
        return jsonify({"error": "Invalid curriculum ID"}), 400

    result = curricula_collection.update_one(
        {"_id": oid, "user_id": ObjectId(user_id)},
        {"$set": {"modules": modules}}
    )

    if result.matched_count == 0:
        return jsonify({"error": "Curriculum not found"}), 404

    return jsonify({"message": "Modules updated successfully"}), 200


@app.route("/api/curriculum/<curriculum_id>", methods=["DELETE"])
@jwt_required()
def delete_curriculum(curriculum_id):
    from bson import ObjectId
    err = require_role("faculty")
    if err:
        return err

    user_id = get_jwt_identity()
    if curricula_collection is None:
        return jsonify({"error": "Database not connected"}), 503

    try:
        result = curricula_collection.delete_one({
            "_id": ObjectId(curriculum_id),
            "user_id": ObjectId(user_id)
        })
    except Exception:
        return jsonify({"error": "Invalid curriculum ID"}), 400

    if result.deleted_count == 0:
        return jsonify({"error": "Curriculum not found"}), 404

    return jsonify({"message": "Curriculum deleted successfully"}), 200


# ─── STUDENT: PUBLIC CURRICULUM ROUTES ───────────────────────────────────────

@app.route("/api/student/curricula", methods=["GET"])
@jwt_required()
def student_list_curricula():
    err = require_role("student")
    if err:
        return err

    if curricula_collection is None:
        return jsonify({"curricula": []}), 200

    search  = request.args.get("q", "").strip()
    level   = request.args.get("level", "").strip()
    subject = request.args.get("subject", "").strip()

    query = {"published": True}
    if search:
        query["$or"] = [
            {"subject":     {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if level:
        query["level"] = level
    if subject:
        query["subject"] = {"$regex": subject, "$options": "i"}

    curricula = list(
        curricula_collection.find(query, {"curriculum": 0})
        .sort("published_at", -1)
        .limit(50)
    )

    # Enrich with faculty name
    from bson import ObjectId
    faculty_cache = {}
    for c in curricula:
        fid = str(c["user_id"])
        if fid not in faculty_cache:
            faculty = users_collection.find_one({"_id": ObjectId(fid)}, {"name": 1})
            faculty_cache[fid] = faculty.get("name", "Faculty") if faculty else "Faculty"
        c["faculty_name"] = faculty_cache[fid]
        c["_id"]          = str(c["_id"])
        c["user_id"]      = fid
        c["created_at"]   = c["created_at"].isoformat()
        if c.get("published_at"):
            c["published_at"] = c["published_at"].isoformat()
        
        c["type"] = c.get("type", "ai")
        c["modules_count"] = len(c.get("modules", []))
        c["progress"] = []
        if progress_collection is not None:
            user_id = get_jwt_identity()
            prog = progress_collection.find_one({"user_id": ObjectId(user_id), "curriculum_id": ObjectId(c["_id"])})
            if prog:
                c["progress"] = prog.get("completed_modules", [])

    return jsonify({"curricula": curricula}), 200


@app.route("/api/student/curricula/<curriculum_id>", methods=["GET"])
@jwt_required()
def student_get_curriculum(curriculum_id):
    from bson import ObjectId
    err = require_role("student")
    if err:
        return err

    if curricula_collection is None:
        return jsonify({"error": "Database not connected"}), 503

    try:
        c = curricula_collection.find_one({"_id": ObjectId(curriculum_id), "published": True})
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    if not c:
        return jsonify({"error": "Curriculum not found or not published"}), 404

    faculty = users_collection.find_one({"_id": c["user_id"]}, {"name": 1})
    c["faculty_name"] = faculty.get("name", "Faculty") if faculty else "Faculty"
    c["_id"]          = str(c["_id"])
    c["user_id"]      = str(c["user_id"])
    c["created_at"]   = c["created_at"].isoformat()
    if c.get("published_at"):
        c["published_at"] = c["published_at"].isoformat()

    c["modules"] = c.get("modules", [])
    c["type"]    = c.get("type", "ai")

    # Get student progress
    progress = None
    if progress_collection is not None:
        user_id = get_jwt_identity()
        prog_doc = progress_collection.find_one({"user_id": ObjectId(user_id), "curriculum_id": ObjectId(curriculum_id)})
        if prog_doc:
            progress = prog_doc.get("completed_modules", [])
    
    c["progress"] = progress or []

    return jsonify({"curriculum": c}), 200


@app.route("/api/student/progress/complete", methods=["POST"])
@jwt_required()
def complete_module():
    from bson import ObjectId
    err = require_role("student")
    if err:
        return err

    user_id = get_jwt_identity()
    data = request.get_json()
    curriculum_id = data.get("curriculum_id")
    module_index  = data.get("module_index") # Use index for reliability

    if curriculum_id is None or module_index is None:
        return jsonify({"error": "Missing curriculum_id or module_index"}), 400

    if progress_collection is None:
        return jsonify({"error": "Database error"}), 500

    # Add to completed_modules set
    progress_collection.update_one(
        {"user_id": ObjectId(user_id), "curriculum_id": ObjectId(curriculum_id)},
        {"$addToSet": {"completed_modules": int(module_index)}},
        upsert=True
    )

    # Check if this course is now 100% complete
    curriculum = curricula_collection.find_one({"_id": ObjectId(curriculum_id)})
    if curriculum and curriculum.get("modules"):
        total_modules = len(curriculum["modules"])
        
        # Get updated progress
        prog_doc = progress_collection.find_one({"user_id": ObjectId(user_id), "curriculum_id": ObjectId(curriculum_id)})
        completed = prog_doc.get("completed_modules", []) if prog_doc else []
        
        if len(completed) >= total_modules:
            # AUTO-SEND Certificate Email!
            user = users_collection.find_one({"_id": ObjectId(user_id)})
            if user:
                subject = f"🎓 Course Completed: {curriculum['subject']} - Certificate Attached!"
                body = f"""
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; text-align: center;">
                    <h2 style="color: #7c3aed;">Congratulations, {user['name']}!</h2>
                    <p>You have successfully completed all modules for <strong>{curriculum['subject']}</strong>.</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 12px; margin: 20px auto; max-width: 400px; border: 1px dashed #7c3aed;">
                        <p style="margin: 0; font-size: 1.1rem; color: #4f46e5;"><strong>Certificate of Completion</strong></p>
                        <p style="margin: 10px 0 0 0; font-size: 0.9rem; color: #6b7280;">Your official certificate is attached to this email as a PDF.</p>
                    </div>
                    <p>Great job on this achievement! Keep up the learning momentum.</p>
                    <p style="font-size: 0.85rem; color: #9ca3af; margin-top: 30px;">Sent with ❤️ by CurricuForge</p>
                </div>
                """
                
                # Generate PDF
                date_str = datetime.utcnow().strftime("%B %d, %Y")
                cert_id = f"CF-{str(curriculum_id)[-6:]}-{str(user_id)[-6:]}".upper()
                pdf_path = generate_certificate_pdf(user["name"], curriculum["subject"], date_str, cert_id)
                
                # Send asynchronously
                thread = threading.Thread(
                    target=send_email_async, 
                    args=(subject, body, [user["email"]], pdf_path, f"Certificate_{curriculum['subject'].replace(' ', '_')}.pdf")
                )
                thread.start()
                
                return jsonify({
                    "message": "Module marked as complete. Course completed! Certificate has been emailed to you.",
                    "completed": True
                }), 200

    return jsonify({"message": "Module marked as complete"}), 200


@app.route("/api/student/certificate/<curriculum_id>", methods=["GET"])
@jwt_required()
def get_certificate(curriculum_id):
    from bson import ObjectId
    user = get_current_user()
    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        oid = ObjectId(curriculum_id)
    except Exception:
        return jsonify({"error": "Invalid ID"}), 400

    curriculum = curricula_collection.find_one({"_id": oid})
    if not curriculum:
        return jsonify({"error": "Curriculum not found"}), 404

    # Check progress
    prog_doc = progress_collection.find_one({"user_id": user["_id"], "curriculum_id": oid})
    completed = prog_doc.get("completed_modules", []) if prog_doc else []
    
    total_modules = len(curriculum.get("modules", []))
    
    # Check if all modules are complete
    # Special case: if no modules defined, maybe it's not a video course?
    if total_modules == 0:
         return jsonify({"error": "This course has no modules to complete."}), 400
    
    if len(completed) < total_modules:
        return jsonify({
            "eligible": False, 
            "message": f"Incomplete: {len(completed)}/{total_modules} modules finished."
        }), 200

    # Return certificate data
    return jsonify({
        "eligible": True,
        "student_name": user["name"],
        "course_name": curriculum["subject"],
        "date": datetime.utcnow().strftime("%B %d, %Y"),
        "certificate_id": f"CF-{str(oid)[-6:]}-{str(user['_id'])[-6:]}".upper()
    }), 200


# ─── HEALTH CHECK ─────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "db": "connected" if db is not None else "disconnected"
    }), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)
