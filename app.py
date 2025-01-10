from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, emit

app = Flask(__name__)
socketio = SocketIO(app)

# Doctor-patient mapping
appointments = {
    "doctor_suresh": ["ravi", "shreya"],
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/doctor/<doctor_id>")
def doctor(doctor_id):
    if doctor_id in appointments:
        return render_template("doctor.html", doctor_id=doctor_id, patients=appointments[doctor_id])
    return "Doctor not found", 404

@app.route("/patient/<patient_name>")
def patient(patient_name):
    for doctor, patients in appointments.items():
        if patient_name in patients:
            return render_template("patient.html", patient_name=patient_name, doctor_id=doctor)
    return "Patient not found", 404

@app.route("/call/<room>")
def video_call(room):
    return render_template("call.html", room=room)

@socketio.on("join_room")
def handle_join_room(data):
    room = data["room"]
    join_room(room)
    emit("user_joined", {"user": data["user"]}, to=room)

@socketio.on("signal")
def handle_signal(data):
    emit("signal", data, to=data["room"], skip_sid=request.sid)

if __name__ == "__main__":
    socketio.run(app, debug=True)
