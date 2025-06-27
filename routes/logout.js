import express from "express";
import db from "../db.js";
import redis from "../controllers/redis.js";
const router=express.Router();

router.delete("/logout",async(req,res)=>{
    const resfreshToken=req.body.token;
    await db.query('DELETE FROM refreshtoken where token = $1',[resfreshToken]);
    await redis.del(resfreshToken)
    res.sendStatus(204);

})
export default router;