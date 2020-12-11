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

app.get("/", (req, resp) => resp.sendFile("generated/web/index.html", sendFileOptions));
app.use("/", express.static("generated/web"));
app.use("/node_modules/bulma/sass", express.static("node_modules/bulma/sass"));
app.get("/node_modules/bulma/bulma.sass", (req, resp) => {
	resp.sendFile("node_modules/bulma/bulma.sass", sendFileOptions);
});
app.use("/src/sass", express.static("src/sass"));

app.use("/", (req) => console.log("Unhandled request!", {
	url: req.originalUrl,
	method: req.method
}));

app.listen(8080, () => {
	console.log("Listening at http://localhost:8080");
});
