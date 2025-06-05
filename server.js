import express from "express";
import env from "dotenv";
import fs from "fs";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"
import authenticate from "./auth.js";
import OpenAI from "openai";

const app = express();
const port = 5000;
const saltRounds=10;
env.config();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


//config ai:
const client = new OpenAI({
    apiKey:process.env.OPENAI_KEY
});

const openFileGame=(req,res,next)=>{
    req.games=JSON.parse(fs.readFileSync('gamesFixed.json', 'utf-8'));
    next();
}
const writeFileGame=(data)=>{
    fs.writeFileSync('gamesFixed.json', JSON.stringify(data, null, 2));
}
app.use(openFileGame)
const openFileUsers=(req,res,next)=>{
    try{
         req.users=JSON.parse(fs.readFileSync("users.json","utf-8"));
         res.status(200);
         next()
        
    }catch(err){
        res.status(500).json({error:"failed to load"})
    }
   
}

const WriteFileUsers=(data)=>{
    fs.writeFileSync('users.json', JSON.stringify(data, null, 2));
}


app.post("/register",openFileUsers,(req,res)=>{
    const users=req.users;
    const username=req.body.username;
    const password=req.body.password;
    const Finduser=users.filter((user)=>user.username==username)
    if(Finduser.length==0){
        bcrypt.hash(password,saltRounds,(err,hash)=>{
        if(err)res.status(404)
        else{
         const user={username:username,password:hash}
         users.push(user);
         WriteFileUsers(users)
         res.status(202).json({success:"user added"})
        }
    })
    }else{
        res.status(505).json({error:"Username has been taken already"})
    }
   


})
app.post("/login", openFileUsers, (req, res) => {
  const { username, password } = req.body;
  const users = req.users;
  const foundUser = users.find(user => user.username === username);
  if (!foundUser){
    return res.status(400).json({ error: "Username doesn't exist, register first" });
  }
  bcrypt.compare(password, foundUser.password, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "internal server error during password verification" });
    }
    if (result) {
      const token = jwt.sign({ name: foundUser.username}, process.env.ACCESS_TOKEN_SECRET);
      return res.json({ token });
    } else {
      return res.status(401).json({ error: "The password is incorrect" });
    }
  });
});



app.get("/games",(req,res)=>{
    res.json(req.games)
})
app.get("/filter",async (req, res) => {
  const games = req.games;
  const gameN = req.query.name;
  if (!gameN) return res.status(400).json({ error: "Missing 'name' query parameter" });
  // try{
  //   const response = await client.chat.completions.create({
  // model: "gpt-4.1-nano",
  // max_tokens: 15,
  // temperature: 0,
  // messages: [
  //   {
  //     role: "system",
  //     content: "Return the full correct name of a game. If unknown, return null."
  //   },
  //   {
  //     role: "user",
  //     content: gameN
  //   }
  //   ]
  //   });
    
    // const FixedName=response.choices[0].message.content;
    const Game = games.find((game) => game.name.toLowerCase() === gameN.toLowerCase());
    if (!Game) return res.status(404).json({ error: "Game not found"});
    res.json(Game);
  // }
  // catch(err){
  //   console.log(err.message)
  //   res.sendStatus(500).json({error:"Internal server error"})
  // }
  
});
app.get("/genres",(req,res)=>{
    const games=req.games
    let genres=games.map((game)=>{
        return game.genres
    })
    let genresNonDup=Array.from(new Set(genres.flat()))
    res.json(genresNonDup)
})
app.get("/random",(req,res)=>{
    console.log(req.user)
    const games=req.games;
    const game=games[Math.floor(Math.random()*games.length)];
    res.json(game);
})
app.get("/ByGenre",(req,res)=>{
    const games=req.games;
    const gameG=req.query.genre;
    let gameGenres=games.filter((game)=>{
        return game.genres.includes(gameG);
    })
    if(gameGenres.length==0)res.status(404).json({error:"This genre doesnt exist"})
    else res.json(gameGenres);
})
app.get("/ByDate",(req,res)=>{
    const games=req.games;
    const dateG=req.query.date;
    let gameDates=games.filter(game=>game.release_date==dateG);
    if(gameDates.length==0)res.status(404).json({error:"This date doesnt exist"})
    else res.json(gameDates)
})
app.post("/addGame",authenticate,(req,res)=>{
    const {name,rating,summary,genres,cover,release_date}=req.body
    const games=req.games
    let ExistGame=games.find((game)=>game.name.toLowerCase()==name.toLowerCase());
    if(!ExistGame){
        let index=games.length+1
        const game={
        id:index,
        name:name,
        rating:rating,
        summary:summary,
        genres:genres,
        cover:cover,
        release_date:release_date
    }
    games.push(game)
    writeFileGame(games)
    res.json(game)
    }
    else{
       return res.status(409).json({error:"the game already exist"})
    }
})
app.listen(port,()=>{
    console.log("The app is listening in port "+port)
})
