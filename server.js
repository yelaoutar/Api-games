import express from "express";
import env from "dotenv";
import fs from "fs";
import bcrypt from "bcrypt";
import authenticate from "./middlewares/auth.js";
import OpenAI from "openai";
import {getData,UpdateData} from "./FetchUserData.js";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";


const app = express();
const port = 5000;
const saltRounds=10;
env.config();
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());

const limiter=rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  message: { error: 'Too many requests, please try again later.' },
  store: new RedisStore({
		sendCommand: (...args) => client.sendCommand(args),
	}),
})

app.use(limiter)

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
app.get("/",(req,res)=>{
  res.render("home.ejs")
})

app.post("/register",async(req,res)=>{
    const users=await getData();
    const username=req.body.username;
    const password=req.body.password;
    const Finduser=users.filter((user)=>user.username==username)
    if(Finduser.length==0){
        bcrypt.hash(password,saltRounds,async(err,hash)=>{
        if(err)res.status(404)
        else{
         const user={username:username,password:hash}
         users.push(user);
         UpdateData(users)
        const success = await UpdateData(users);
        if (success) {
        res.status(201).json({ success: "User added." });
        } 
        else {
        res.status(500).json({ error: "Failed to update user data." });
      }
       
        }
    })
    }else{
        res.status(505).json({error:"Username has been taken already"})
    }
})
app.get("/games",(req,res)=>{
    res.json(req.games)
})
app.get("/filter",async (req, res) => {
  const games = req.games;
  const gameN = req.query.name;
  if (!gameN) return res.status(400).json({ error: "Missing 'name' query parameter" });
  try{
  const response = await client.chat.completions.create({
  model: "gpt-4.1-nano",
  max_tokens: 15,
  temperature: 0,
  messages: [
    {
      role: "system",
      content: "Return the full correct name of a game. If unknown, return null."
    },
    {
      role: "user",
      content: gameN
    }
    ]
    });
    
    const FixedName=response.choices[0].message.content.trim().replace(/^"|"$/g, "");
    const Game = games.find((game) => game.name.toLowerCase() === gameN.toLowerCase());
    const GameAi = games.find((game) => game.name.toLowerCase() === FixedName.toLowerCase());
    if(GameAi){
      return res.json(GameAi);
    }
    else if(Game){
      return res.json(Game);
    }
    else return res.status(404).json({ error: "Game not found"});
    
  }
  catch(err){
    console.log(err.message)
    res.sendStatus(500).json({error:"Internal server error"})
  }
  
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
    if(gameDates.length==0)res.status(404).json({error:"this date doesnt exist"})
    else res.json(gameDates)
})
app.get("/dates",(req,res)=>{
  const games=req.games;
  let dates=games.map((game)=>{
        return game.release_date
    })
    let datesNonDup=Array.from(new Set(dates.flat()))
    res.json(datesNonDup)

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
app.post("/chatbot", authenticate,async (req, res) => {
  const user_input = req.body.content;
  const memory_summary = req.body.summary || "Nothing discussed yet.";

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 60,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant focused only on games no other topics.Answer in one line only . Here's a summary of past conversation: ${memory_summary}`
        },
        {
          role: "user",
          content: user_input
        }
      ]
    });

    const ai_reply = response.choices[0].message.content;

    const summary_response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 60,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "Summarize the following conversation about games in one line."
        },
        {
          role: "user",
          content: `Previous summary: ${memory_summary}\nUser: ${user_input}\nBot: ${ai_reply}\nNew summary:`
        }
      ]
    });
    const summary = summary_response.choices[0].message.content;
    res.json({
      reply: ai_reply,
      summary: `${summary} | User: ${user_input} -> AI: ${ai_reply}`
    });

  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.patch("/updateGame",authenticate,(req,res)=>{
  const { name, rating, summary, genres, cover, release_date } = req.body;
  const games = req.games;

  const existingGame = games.find(
    (game) => game.name.toLowerCase() === name.toLowerCase()
  );
  if (!existingGame) {
    return res.status(404).json({ error: "Game not found" });
  }
  const index = games.findIndex(
    (game) => game.name.toLowerCase() === name.toLowerCase()
  );
  const updatedGame = {
    ...existingGame,
    rating: rating ?? existingGame.rating,
    summary: summary ?? existingGame.summary,
    genres: genres ?? existingGame.genres,
    cover: cover ?? existingGame.cover,
    release_date: release_date ?? existingGame.release_date,
  };
  games[index] = updatedGame;
  writeFileGame(games);
  res.json({ success: "Updated by success", game: updatedGame });
});

app.listen(port,()=>{
    console.log("The app is listening in port "+port)
    
})
