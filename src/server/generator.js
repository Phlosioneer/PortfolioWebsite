"use strict";

const path = require('path');
const fs = require('fs/promises');
const toml = require('toml');
const mustache = require('mustache');

const templateDir = process.argv[2];
const outputDir = process.argv[3];

async function readProjectData() {
	const raw = await fs.readFile('resources/projects.toml');
	const parsed = await toml.parse(raw);
	return parsed;
}

async function readTemplates() {
	const options = { "encoding": "utf8" };
	const index = fs.readFile(path.join(templateDir, 'index.mustache'), options);
	const featured = fs.readFile(path.join(templateDir, 'featuredCard.mustache'), options);
	const normal = fs.readFile(path.join(templateDir, 'normalCard.mustache'), options);
	return {
		"index": await index,
		"featuredCard": await featured,
		"normalCard": await normal
	};
}

function validateConfigFile(config) {
	// Validate everything is categorized correctly.
	const allProjectNames = Object.keys(config.projects);
	allProjectNames.forEach(name => {
		if (!config.featured.includes(name) && !config.not_featured.includes(name)) {
			console.error("Config file: ", config);
			throw "Project " + name + " not categorized";
		}
	});
	config.featured.forEach(name => {
		if (config.not_featured.includes(name)) {
			console.error("Config file: ", config);
			throw "Project " + name + " is both featured and not_featured";
		}
	});
}

// Transform the human-friendly config file into a more computer-friendly
// format.
function buildPage(config) {
	// Normalize data.
	const allProjectNames = Object.keys(config.projects);
	allProjectNames.forEach(name => {
		const project = config.projects[name];
		if (typeof project.language === "string") {
			project.language = [project.language];
		}
	});

	// Categorize projects.
	const featured = [];
	const normal = [];
	config.featured.forEach(name => featured.push(config.projects[name]));
	config.not_featured.forEach(name => normal.push(config.projects[name]));

	return {
		"featured": featured,
		"normalTable": buildNormalProjectSection(normal)
	};
}

function buildNormalProjectSection(projects) {
	// Organize the normal projects into rows of 4.
	const table = [];
	var row = [];
	projects.forEach(project => {
		row.push(project);
		if (row.length == 4) {
			table.push({"normalProjects": row});
			row = [];
		}
	});
	return table;
}

async function main() {
	const templatePromises = readTemplates();
	const rawProjectData = await readProjectData();
	validateConfigFile(rawProjectData);
	const projectData = buildPage(rawProjectData);
	const templates = await templatePromises;
	const fullPage = mustache.render(templates.index, projectData, templates);
	const outPath = path.join(outputDir, "index.html");
	await fs.writeFile(outPath, fullPage);
	console.log(outPath + " generated.");
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});

