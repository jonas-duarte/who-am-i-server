const WebSocket = require("ws");

const port = process.env.SERVER_PORT || 8080;

console.log(`Server is running on port ${port}`);

const wss = new WebSocket.Server({ port });

const rooms = {};

wss.on("connection", function connection(ws) {
  const player = { ws, name: null, character: "...", room: null };

  ws.on("message", function incoming(message) {
    const { type, payload } = JSON.parse(message);
    if (type === "join") {
      const { room, name } = payload;

      player.name = name;
      player.room = room;

      if (!rooms[room]) {
        rooms[room] = {
          players: [],
        };
      }

      ws.send(
        JSON.stringify({
          type: "joined",
          payload: rooms[room].players.map((player) => ({
            name: player.name,
            character: player.character,
          })),
        })
      );

      rooms[room].players.push(player);

      rooms[room].players.forEach((otherPlayer) => {
        if (otherPlayer.ws !== ws)
          otherPlayer.ws.send(
            JSON.stringify({
              type: "player-joined",
              payload: {
                name: player.name,
                character: player.character,
              },
            })
          );
      });
    }

    if (type === "suggest-character") {
      const _player = rooms[player.room].players.find(
        (p) => p.name === payload.name
      );
      _player.character = payload.character;

      rooms[player.room].players
        .filter((p) => p.ws !== ws && p.name !== _player.name)
        .forEach((otherPlayer) => {
          otherPlayer.ws.send(
            JSON.stringify({
              type: "player-update-character",
              payload: {
                name: _player.name,
                character: _player.character,
              },
            })
          );
        });
    }
  });

  ws.on("close", function close() {
    const { room } = player;
    if (room) {
      rooms[room].players = rooms[room].players.filter(
        (otherPlayer) => otherPlayer.ws !== ws
      );
      rooms[room].players.forEach((otherPlayer) => {
        otherPlayer.ws.send(
          JSON.stringify({
            type: "player-left",
            payload: {
              name: player.name,
            },
          })
        );
      });
    }
  });
});
