from flask import Flask, jsonify
from flask_cors import CORS
from database import exportar, init_db

app = Flask(__name__)
CORS(app)

@app.route("/api/data")    
def data():    return jsonify(exportar())
@app.route("/api/pisos")   
def pisos():   return jsonify(exportar()["pisos"])
@app.route("/api/trabajos")
def trabajos(): return jsonify(exportar()["trabajos"])
@app.route("/api/stats")   
def stats():   return jsonify(exportar()["stats"])
@app.route("/health")      
def health():  return jsonify({"status":"ok"})

if __name__ == "__main__":
    init_db()
    print("🌐 API en http://0.0.0.0:5001")
    app.run(host="0.0.0.0", port=5001, debug=False)
