from flask import Flask
import requests

app = Flask(__name__)

@app.route("/")
def hello_world():
    print(requests.get("http://service-2:5000"))
    return "<p>Hello, World!</p>"

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
