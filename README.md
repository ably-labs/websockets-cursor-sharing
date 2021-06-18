# websockets-cursor-sharing

# How it's built

* /app is the browser application
* /api is a node.js web sockets server
* Web app connects to web sockets server
* On connection, each client is assigned an `id` and a `color`.
* On mouse move, coordinate updates are sent to the server
* The server adds the client's `id` and other metadata
* The enhanced message is sent to all the clients.


# Running this sample

This sample includes two applications, a web app, that we serve through Snowpack, and a Node.a

```bash
> npm install
> npm run start
```