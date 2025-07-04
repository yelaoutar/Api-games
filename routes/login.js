import {getData} from "../FetchUserData.js";
import express from "express";
import env from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db.js";
import redis from "../controllers/redis.js";
const router=express.Router();
env.config();

router.post("/login", async(req, res) => {
  const { username, password } = req.body;
  const users = await getData();
  const foundUser = users.find(user => user.username === username);
  if (!foundUser){
    return res.status(400).json({ error: "Username doesn't exist register first" });
  }
  bcrypt.compare(password, foundUser.password, async(err, result) => {
    if (err) {
      return res.status(500).json({ error: "internal server error during password verification" });
    }
    if (result) {
      const token = jwt.sign({ name: foundUser.username}, process.env.ACCESS_TOKEN_SECRET,{expiresIn:"15m"});
      const refreshToken=jwt.sign({name:foundUser.username},process.env.REFRECH_TOKEN)
      const expireDate=new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db.query("INSERT INTO refreshtoken values ($1,$2)",[refreshToken,expireDate]);
      await redis.set(refreshToken, foundUser.username, {
      EX: 7 * 24 * 60 * 60,
    });
      console.log(redis.get(refreshToken)) ;
      return res.json({ token , refreshToken});
    } else {
      return res.status(401).json({ error: "The password is incorrect" });
    }
  });
})
export default router
