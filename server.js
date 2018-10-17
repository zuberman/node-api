require('dotenv').config();

const bodyParser = require('body-parser');
const pgp = require('pg-promise')();
const express = require('express');
const app = express();
const db = pgp({
    host: 'localhost',
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD
});

app.use(bodyParser.json());

app.get('/api/artists', function(req, res){
    db.any('SELECT * FROM artist')
      .then(function(data) {
          res.json(data);
      })
      .catch(function(error) {
          res.json({error: error.message});
      });
});

app.get('/api/songs', function(req, res){
    db.any('SELECT song.id, artist.name, song.title, song.year FROM song, artist WHERE song.artist_id=artist.id')
      .then(function(data) {
          res.json(data);
      })
      .catch(function(error) {
          res.json({error: error.message});
      });
});

app.get('/api/playlists', function(req, res){
    db.any('SELECT * FROM playlist')
      .then(function(data) {
          res.json(data);
      })
      .catch(function(error) {
          res.json({error: error.message});
      });
});

app.get('/api/songs/:id', function(req, res){
  const id = req.params.id;
    db.any('SELECT song.id, artist.name, song.title FROM song, artist WHERE song.artist_id=artist.id AND song.id=$1', [id])
      .then(function(data) {
          res.json(data);
      })
      .catch(function(error) {
          res.json({error: error.message});
      });
});

app.post('/api/artists', function(req, res){
  // using destructing assignment to
  // extract properties into variables
  const {name, email} = req.body;
  // ES6 strings for multiline
  db.one(`INSERT INTO artist(name, email)
          VALUES($1, $2) RETURNING id`, [name, email])
    .then(data => {
      // let's combine returned id with submitted data and
      // return object with id to user
      res.json(Object.assign({}, {id: data.id}, req.body));
    })
    .catch(error => {
      res.json({
        error: error.message
      });
    });
});

app.post('/api/songs', function(req, res){
  // using destructing assignment to
  // extract properties into variables
  const {artistId, title, year} = req.body;
  // ES6 strings for multiline
  db.one(`INSERT INTO song(artist_id, title, year)
          VALUES($1, $2, $3) RETURNING id`, [artistId, title, year])
    .then(insertedSong => {
      return db.one(`SELECT song.id, artist.name, song.title FROM song, artist WHERE song.id = $1 AND song.artist_id=artist.id`, [insertedSong.id])
    })
    .then(song => {
      res.json(song)
    })
    .catch(error => {
      res.json({
        error: error.message
      });
    });
});

app.post('/api/playlists', function(req, res){
  // using destructing assignment to
  // extract properties into variables
  const {name} = req.body;
  // ES6 strings for multiline
  db.one(`INSERT INTO playlist(name)
          VALUES($1) RETURNING id`, [name])
    .then(data => {
      // let's combine returned id with submitted data and
      // return object with id to user
      res.json(Object.assign({}, {id: data.id}, req.body));
    })
    .catch(error => {
      res.json({
        error: error.message
      });
    });
});

app.post('/api/playlists/:playlistId/songs', function(req, res){
  // using destructing assignment to
  // extract properties into variables
  const {artistId, title, year} = req.body;
  const {playlistId} = req.params;
  // ES6 strings for multiline
  db.one(`INSERT INTO song(artist_id, title, year)
          VALUES($1, $2, $3) RETURNING id`, [artistId, title, year])
    .then(insertedSong => {
      return db.one(`INSERT INTO song_playlist(song_id, playlist_id)
              VALUES($1, $2) RETURNING id`, [insertedSong.id, playlistId])
        })
    .then(song => {
      res.json(song)
    })
    .catch(error => {
      res.json({
        error: error.message
      });
    });
});

app.delete('/playlists/:id/songs/:songId', function(req, res){
  const {songId, id} = req.params;
  // const songId = req.params.songId;
  // const id = req.params.id;
  return db.none(`DELETE FROM song_playlist WHERE playlist_id=$1 AND song_id=$2`, [id, songId])
  .then(song => {
    res.send(204)
  })
  .catch(error => {
    res.json({
      error: error.message
    });
  });
})

app.delete('/playlists/:id', function(req, res){
  const {id} = req.params;
  // const songId = req.params.songId;
  // const id = req.params.id;
  return db.none(`DELETE FROM song_playlist WHERE playlist_id=$1`, [id])
  .then(deletedplaylistsongs => {
    return db.none(`DELETE FROM playlist WHERE playlist.id=$1`, [id])
      })
  .then(song => {
    res.send(204)
  })
  .catch(error => {
    res.json({
      error: error.message
    });
  });
})

app.patch('/artists/:id', function(req, res){
  const {id} = req.params;
  const {name, email} = req.body;
  const arguments = Object.keys(req.body)

  if (name && email) {
    return db.none(`UPDATE artist SET name=$2, email=$3   WHERE artist.id=$1`, [id, name, email])
    .then(song => {
      res.send(204)
    })
    .catch(error => {
      res.json({
        error: error.message
      });
    });
  } else if (name) {
    return db.none(`UPDATE artist SET name=$2 WHERE artist.id=$1`, [id, name])
    .then(song => {
      res.send(204)
    })
    .catch(error => {
      res.json({
        error: error.message
      });
    });
  } else if (email) {
    return db.none(`UPDATE artist SET email=$3 WHERE artist.id=$1`, [id, email])
    .then(song => {
      res.send(204)
    })
    .catch(error => {
      res.json({
        error: error.message
      });
    });
  } else {
    res.send(404)
  }

  // let results = arguments.reduce((acc, property) => {
  // acc.push(property)
  // acc.push(req.body[property])
  // return acc
  // },  []);
  // results = results.concat(id);
  //
  // if (results.length === 5) {
  //   return db.one(`UPDATE artist SET $1=$2, $3=$4 WHERE artist.id=$5`, results)
  //   .then(song => {
  //     res.send(204)
  //   })
  //   .catch(error => {
  //     res.json({
  //       error: error.message
  //     });
  //   });
  // }
  // if (results.length === 3) {
  //   return db.one(`UPDATE artist SET $1=$2 WHERE artist.id=$3`, results)
  //   .then(song => {
  //     res.send(204)
  //   })
  //   .catch(error => {
  //     res.json({
  //       error: error.message
  //     });
  //   });
  // }
})

app.patch('/playlist/:id', function(req, res){
  const {id} = req.params;
  const {name} = req.body;

  return db.one(`UPDATE playlist SET name=$1 WHERE id=$2 RETURNING id`, [name, id])
  .then(song => {
    res.json(Object.assign({}, song, {name}))
  })
  .catch(error => {
    res.json({
      error: error.message
    });
  });
})

app.delete('/song/:id', function(req, res){
  const {id} = req.params;
  // const songId = req.params.songId;
  // const id = req.params.id;
  return db.none(`DELETE FROM song_playlist WHERE song_id=$1`, [id])
  .then(deletedplaylistsongs => {
    return db.none(`DELETE FROM song WHERE song.id=$1`, [id])
      })
  .then(song => {
    res.send(204)
  })
  .catch(error => {
    res.json({
      error: error.message
    });
  });
})

app.delete('/artists/:id', function(req, res){
  const {id} = req.params;
  // const songId = req.params.songId;
  // const id = req.params.id;
  //return db.none(`DELETE FROM song_playlist, song WHERE song.artist_id=$1 AND song_playlist.song_id=song.id` , [id])
  return db.none(`DELETE FROM song_playlist WHERE song_playlist.id IN (
    SELECT song_playlist.id FROM song_playlist, song WHERE song.artist_id=$1 AND song_playlist.song_id=song.id
  )` , [id])
  .then(deletedplaylistsongs => {
    return db.none(`DELETE FROM song WHERE artist_id=$1`, [id])
      })
    .then(deletedplaylistsongs => {
      return db.none(`DELETE FROM artist WHERE artist.id=$1`, [id])
        })
  .then(song => {
    res.send(204)
  })
  .catch(error => {
    res.json({
      error: error.message
    });
  });
})

app.listen(8080, function() {
  console.log('Listening on port 8080!');
});
