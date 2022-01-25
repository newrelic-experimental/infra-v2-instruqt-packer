import newrelic.agent
newrelic.agent.initialize('/app/newrelic.ini')

import os
import uuid
import json
import requests
from flask import Flask
from flask import request
from flask import jsonify
from rabbitmq import Publisher

app = Flask(__name__)

CART = os.getenv('CART_HOST', 'cart')
USER = os.getenv('USER_HOST', 'user')
PAYMENT_GATEWAY = os.getenv('PAYMENT_GATEWAY', 'https://paypal.com/')

@app.errorhandler(Exception)
def exception_handler(err):
    return str(err), 500

@app.route('/health', methods=['GET'])
def health():
    return 'OK'

@app.route('/pay/<id>', methods=['POST'])
def pay(id):
    newrelic.agent.add_custom_parameter('user_id', id)
    cart = request.get_json()

    anonymous_user = True

    # check user exists
    try:
        req = requests.get('http://{user}:8080/check/{id}'.format(user=USER, id=id))
    except requests.exceptions.RequestException as err:
        return str(err), 500
    if req.status_code == 200:
        anonymous_user = False

    # check that the cart is valid
    # this will blow up if the cart is not valid
    has_shipping = False
    for item in cart.get('items'):
        if item.get('sku') == 'SHIP':
            has_shipping = True

    if cart.get('total', 0) == 0 or has_shipping == False:
        return 'cart not valid', 400

    # dummy call to payment gateway, hope they dont object
    try:
        req = requests.get(PAYMENT_GATEWAY)
    except requests.exceptions.RequestException as err:
        return str(err), 500
    if req.status_code != 200:
        return 'payment error', req.status_code

    # Generate order id
    orderid = str(uuid.uuid4())
    queueOrder({ 'orderid': orderid, 'user': id, 'cart': cart })

    # add to order history
    if not anonymous_user:
        try:
            req = requests.post('http://{user}:8080/order/{id}'.format(user=USER, id=id),
                    data=json.dumps({'orderid': orderid, 'cart': cart}),
                    headers={'Content-Type': 'application/json'})
        except requests.exceptions.RequestException as err:
            return str(err), 500

    # delete cart
    try:
        req = requests.delete('http://{cart}:8080/cart/{id}'.format(cart=CART, id=id))
    except requests.exceptions.RequestException as err:
        return str(err), 500
    if req.status_code != 200:
        return 'order history update error', req.status_code

    return jsonify({ 'orderid': orderid })


def queueOrder(order):
    publisher.publish(order, {})


# RabbitMQ
publisher = Publisher(app)

if __name__ == "__main__":
    port = int(os.getenv("SHOP_PAYMENT_PORT", "8080"))
    app.run(host='0.0.0.0', port=port)
