import express from "express";
import env from "dotenv";
import cors from "cors"
import db from "./db.js";
import RouterToken from "./routes/token.js";
import RouterLogin from "./routes/login.js";
import RouterLogout from "./routes/logout.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import client from "./controllers/redis.js";
const app = express();
const port = 4000;
env.config();
app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
const limiter=rateLimit({
	windowMs: 7 * 60 * 1000, // 7 minutes
	limit:10, // Limit each IP to 10 requests per `window` (here, per 7 minutes).
	standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
	// store: ... , // Redis
    message: { error: 'Too many requests, please try again later.' },
    store: new RedisStore({
		sendCommand: (...args) => client.sendCommand(args),
	}),
})

db.connect();
app.use(limiter);
app.use("/api",RouterToken);
app.use("/api",RouterLogin);
app.use("/api",RouterLogout);

app.listen(port,()=>{
    console.log("The app is listening in port "+port)
    
})
