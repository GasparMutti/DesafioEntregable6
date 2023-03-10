import express from "express";
import {Server} from "socket.io";
import handlebars from "express-handlebars";
import __dirname, {strategyPassport} from "./utils.js";
import cookieParser from "cookie-parser";
import session from "express-session";
import FileStore from "session-file-store";
import MongoStore from "connect-mongo";
import viewsRouter from "./routes/views.router.js";
import sessionRouter from "./routes/session.router.js";
import productsRoutes from "./routes/products.router.js";
import cartsRoutes from "./routes/carts.router.js";
import messageModel from "./dao/models/messages.model.js";
import mongoose from "mongoose";
import passport from "passport";
import initPassport from "./config/passportConfig.js";

const app = express();

const FileStorage = FileStore(session);

const httpServer = app.listen(8080, () =>
  console.log("app listen on port", 8080)
);

const io = new Server(httpServer);

mongoose.set("strictQuery", false);

mongoose.connect(
  "mongodb+srv://CoderUser:coderuser123@codercluster.srkjtjy.mongodb.net/ecommerce?retryWrites=true&w=majority",
  (error) => {
    if (error) {
      console.log("No hubo conexion", error);
      process.exit();
    }
  }
);

app.engine("handlebars", handlebars.engine());

app.set("views", __dirname + "/views");
app.set("view engine", "handlebars");

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));
app.use(
  session({
    store: MongoStore.create({
      mongoUrl:
        "mongodb+srv://CoderUser:coderuser123@codercluster.srkjtjy.mongodb.net/ecommerce?retryWrites=true&w=majority",
      mongoOptions: {useNewUrlParser: true, useUnifiedTopology: true},
      ttl: 60 * 60,
    }),
    secret: "secretCoder",
    resave: false,
    saveUninitialized: false,
  })
);
initPassport();
app.use(
  passport.session({
    secret: "secretCoder",
  })
);
app.use(passport.initialize());

app.get("/current", strategyPassport("jwt"), (req, res) => {
  res.send(req.user);
});
app.use("/", viewsRouter);
app.use("/api/session", sessionRouter);
app.use("/api/products", productsRoutes);
app.use("/api/carts", cartsRoutes);

async function getLogs() {
  return await messageModel.find();
}

io.on("connection", async (socket) => {
  console.log("New client connected");

  const logs = await getLogs();
  io.emit("log", {logs});
  socket.on("message", async (data) => {
    await messageModel.create({
      user: data.user,
      message: data.message,
      time: data.time,
    });
    const logs = await getLogs();
    io.emit("log", {logs});
  });
  socket.on("userAuth", (data) => {
    socket.broadcast.emit("newUser", data);
  });
});
