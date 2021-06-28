# websockets and Node - A Cursor Position Sharing Demo

WebSockets enable developers to build realtime functionality into their apps. WebSockets allow us to send small send small chunks of data over a single persistent connection, in both directions. Using WebSockets in the front end is fairly straightforward, as there is a [WebSocket API built into all modern browsers](https://caniuse.com/websockets). In order to use WebSockets on the server, a backend application is required. This is where Node.js comes in. Node.js can maintain many hundreds of these WebSockets connections simultaneously. Handling Websockets on the server can become complicated as the connection upgrade from HTTP to WebSockets requires handling, which is why developers will usually use a library to manage this for them. There are a few common WebSocketServer libraries that exist to make managing WebSockets easier - notably [WS](https://www.npmjs.com/package/ws) and [Socket.io](https://www.npmjs.com/package/socket.io). 

## WS - A Node.js WebSocket library

WS is a web socket server for node.js. It's quite low level, literally allowing us to listen to incoming connection requests and respond to raw messages as either strings or byte buffers. Since WebSockets are natively supported in all modern browsers, it is possible to work with WS on the server and the browser's WebSockets api on the client.

In order to demonstrate how to set up WebSockets with Node and WS, we have built a demo app which shares users' cursor positions in realtime.

## Building the Interactive Cursor Position Sharing Demo

We'll build a demo which will create a coloured cursor icon for every user that is connected. When they move their mouse around, their cursor icon will move on the screen and will also be shown moving on the screen of every connected user. This will happen in realtime, as the mouse is being moved.

### The Web Sockets Server

First we'll require the ws library and use the `WebSocket.Server` method to create a new WebSocket server on port 7071 (no significance, any port is fine!)

```js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 7071 });
```

Next we'll create a Map to store a client's metadata (any data we wish to associate with a WebSocket client):

```js
const clients = new Map();
```

Then we'll subscribe to the wss `connection` event using the `wss.on` function, providing a callback.
This will be called whenever a new WebSocket client connects to the server:

```js
wss.on('connection', (ws) => {
    const id = uuidv4();
    const color = Math.floor(Math.random() * 360);
    const metadata = { id, color };

    clients.set(ws, metadata);
```

Every time a client connects, we'll generate a new unique Id, which will be used to identify each user. They will also be assigned a cursor colour by using Math.random() to generate a number between 0 and 360 to assign to the hue value of a hsv colour. These two properties are then added to an object that we'll call `metadata` and we're using the `Map` to associate them with our `ws` WebSocket instance.

This map is a dictionary - we can retrieve this metadata by calling `get` and providing a WebSocket instance later on.

Using the newly connected WebSocket instance, we subscribe to that instance's `message` event - and provide a callback function that will be triggered whenever this specific client sends a message to the server.

```js
    ws.on('message', (messageAsString) => {
```

Note that this event is on the `WebSocket Instance` - `ws` - itself, and not the `WebSocketServer` instance `wss`.

Whenever a message is received by our server, we use JSON.parse to get the message contents, and load our client metadata for this socket from our Map using `clients.get(ws);`.

We're going to add our two metadata properties to the message as `sender` and `color`...

```js
      const message = JSON.parse(messageAsString);
      const metadata = clients.get(ws);

      message.sender = metadata.id;
      message.color = metadata.color;
```

Then we `stringify` our message again, and sent it out to every connected client.

```js
      const outbound = JSON.stringify(message);

      [...clients.keys()].forEach((client) => {
        client.send(outbound);
      });
    });
```

Finally, when a client closes its connection, we remove its `metadata` from our `Map`.

```js
    ws.on("close", () => {
      clients.delete(ws);
    });
});
```

At the bottom we have a function to generate a unique id.

```js
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

console.log("wss up");
```

This server implementation `multicasts` - it sends any message sent *to* it, to *all connected clients*.

We now need to write some client-side code to connect to our WebSocket server, and transmit their mouse position as it moves.

# The client side

We're going to start with some standard HTML5 boilerplate

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>   
```

Then we'll add a reference to a style sheet, and an `index.js` file that we're adding as a `ES Module` (using type="module").

```html
    <link rel="stylesheet" href="style.css">
    <script src="index.js" type="module"></script>
</head>
```

Our body contains a single `HTML template` - which contains an  `SVG image` of a pointer.
We're going to use JavaScript to clone this template whenever a new user connects to our server.

```html
<body id="box">
    <template id="cursor">
        <svg viewBox="0 0 16.3 24.7" class="cursor">
            <path stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" d="M15.6 15.6L.6.6v20.5l4.6-4.5 3.2 7.5 3.4-1.3-3-7.2z" />
        </svg>
    </template>
</body>
</html>
```

Next, we need to use JavaScript to connect to the `WebSocket Server`.

```js
(async function() {

    const ws = await connectToServer();      
```

We're calling a function called connectToServer here that resolves a promise containing our connected `WebSocket`. This function is further down in our file.

Once connected, we add an `onmousemove` handler to our `document.body`. The messageBody is really simple - the current `clientX` and `clientY` properties from the mouse movement event.

We stringify this object, and send it down our now connected `ws` `WebSocket` instance as the message text.

```js
    document.body.onmousemove = (evt) => {
        const messageBody = { x: evt.clientX, y: evt.clientY };
        ws.send(JSON.stringify(messageBody));
    };
```

Next, we need to add `onmessage` event handler to our `WebSocket` instance `ws` - remember that every time the `WebSocketServer` receives a message, it'll forward it on to *all connected clients*.

You might notice that the syntax here is slightly different than the server-side `WebSocket` code, that's because we're using the browsers native `WebSocket` class, rather than the `npm` library `ws` here.

```js
    ws.onmessage = (webSocketMessage) => {
        const messageBody = JSON.parse(webSocketMessage.data);
        const cursor = getOrCreateCursorFor(messageBody);
        cursor.style.transform = `translate(${messageBody.x}px, ${messageBody.y}px)`;
    };   
```

When we receive a message over our `WebSocket`, we parse the `data` property of the message - the data property contains the `stringified` data that our `onmousemove` handler sent to the `WebSocketServer`, along with the additional `sender` and `color` properties that the server side code adds to the message.

Using this parsed messageBody, we call `getOrCreateCursorFor` - this function returns a `HTML element` that is part of the DOM, and we'll look at how it works later.

We then use the x and y values from the `messageBody` to adjust the cursor position using a `CSS transform`.

Our code relies on two utility functions. The first is `connectToServer` which opens a connection to our `WebSocketServer`, and then returns a `Promise` that resolves when the `WebSockets` `readystate` property is 1 - CONNECTED. 

This means that we can just `await` this function, and we'll know that we have a connected and working `WebSocket` connection.

```js
    async function connectToServer() {    
        const ws = new WebSocket('ws://localhost:7071/ws');
        return new Promise((resolve, reject) => {
            setInterval(() => {
                if(ws.readyState === 1) {
                    resolve(ws);
                }
            }, 10);
        });   
    }
```

We also use our `getOrCreateCursorFor` function.

This function first attempts to find any existing element with the HTML data attribute `data-sender` where the value is the same as the `sender` property in our message. If it finds one, we know that we've already created a cursor for this user, and we just need to return it so the calling code can adjust its position.

```js
    function getOrCreateCursorFor(messageBody) {
        const sender = messageBody.sender;
        const existing = document.querySelector(`[data-sender='${sender}']`);
        if (existing) {
            return existing;
        }
```

If we can't find an existing element, we `clone` our `HTML template`, add the data-attribute with the current `sender` id to it, and append it to the `document.body` before returning it.

```js
        const template = document.getElementById('cursor');
        const cursor = template.content.firstElementChild.cloneNode(true);
        const svgPath = cursor.getElementsByTagName('path')[0];    
            
        cursor.setAttribute("data-sender", sender);
        svgPath.setAttribute('fill', `hsl(${messageBody.color}, 50%, 50%)`);    
        document.body.appendChild(cursor);

        return cursor;
    }

})();
```

Now when you run the web application, each user viewing the page will have a cursor that appears on everyone's screens because we are sending the data to all the clients using `WebSockets`.

# Does this scale?

You might notice that we're storing `state` in our node.js WebSocketServer - we have a `Map` that keeps track of connected `WebSockets` and their associated metadata. This means that for this solution to work, and your users to all see one-another, they have to be connected to the exact same `WebSocketServer`.

The number of active users you can support will then be directly related to how much hardware your server has. Node.js is pretty good at managing `concurrency`, but once you reach a few hundred to a few thousand users, you're going to need to scale your hardware **vertically** to keep all your users in sync.

Scaling **vertically** is often quite an expensive proposition, and you'll always be faced with a performance ceiling of the most powerful piece of hardware you can procure.

Once you've run out of vertical scaling options, you'll be forced to consider **horizontal** scaling - and horizontally scaling `WebSockets` is significantly more difficult.

# What makes WebSockets hard to scale?

To scale regular application servers that don't require persistent connections, the standard approach is to introduce a `load balancer` in front of your application servers, and the load balancers will route traffic to whichever node is currently "free" (either by measuring node performance, or using a round-robin system).

`WebSockets` are fundamentally harder to scale, because connections to your `WebSocketServer` need to be **persistent**.

Once you've scaled out your `WebSocketServer` nodes, you also need to provide a solution for sharing data between the nodes. Any state needs to be stored *out-of-process* - usually using something like Redis, or a traditional database, to make sure that all of the nodes have the same view of state.

In addition to having to share state using additional technology, *broadcasting* to all subscribed clients becomes difficult, because any given `WebSocketServer` node only knows about the clients connected to itself.

There are multiple ways to solve this - either by using some form of direct connection between the nodes in the cluster that are handling the traffic, or by using some external pub/sub mechanism (like Redis). This is sometimes called "adding a backplane" to your infrastructure, and is yet another moving part that makes scaling `WebSockets` difficult.

WebSockets in node perform very well, but growing them becomes more and more difficult as your traffic profiles increase.

# Running this sample

This sample includes two applications, a web app, that we serve through Snowpack, and a Node.js webserver.

```bash
> npm install
> npm run start
```

Our NPM start task will spin up both the API and the webserver.