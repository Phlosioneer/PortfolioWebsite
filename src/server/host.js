"use strict";

const path = require('path');
const express = require("express");
const app = express();

const projectRoot = process.argv[2];

const sendFileOptions = {
	root: projectRoot
};

app.use("/", (req, resp, next) => {
	console.log({
		url: req.originalUrl,
		method: req.method
	});
	next();
});

// Website
app.get("/", (req, resp) => resp.sendFile("generated/web/index.html", sendFileOptions));
app.use("/", express.static("generated/web"));
app.use("/", express.static("resources/images"));

// Dependencies
const faPath = "node_modules/@fortawesome/fontawesome-free"
app.use("/fontawesome/", express.static(path.join(faPath, "css")));
app.use("/webfonts/", express.static(path.join(faPath, "webfonts")));
app.get("/splide.js", (req, resp) => resp.sendFile("node_modules/@splidejs/splide/dist/js/splide.js", sendFileOptions));
app.get("/splide.min.css", (req, resp) => resp.sendFile("node_modules/@splidejs/splide/dist/css/themes/splide-default.min.css", sendFileOptions));

// SASS debugging stuff
app.use("/node_modules/bulma/sass", express.static("node_modules/bulma/sass"));
app.get("/node_modules/bulma/bulma.sass", (req, resp) => {
	resp.sendFile("node_modules/bulma/bulma.sass", sendFileOptions);
});
app.use("/src/sass", express.static("src/sass"));

// Favicon not implemented
app.get("/favicon.ico", (req, resp) => resp.sendStatus(404));



app.use("/", (req, resp) => {
	console.log("Unhandled request!", {
		url: req.originalUrl,
		method: req.method
	});
	resp.sendStatus(501);
});

app.listen(8080, () => {
	console.log("Listening at http://localhost:8080");
});
