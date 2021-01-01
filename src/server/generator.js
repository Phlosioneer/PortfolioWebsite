"use strict";

// TODO: Check the width and height of images and add those to image elements.

const path = require('path');
const fs = require('fs/promises');
const { promisify } = require('util');

const toml = require('toml');
const mustache = require('mustache');
const imageSize = promisify(require('image-size'));

const templateDir = process.argv[2];
const outputDir = process.argv[3];

async function readProjectData() {
	const raw = await fs.readFile('resources/projects.toml');
	const parsed = await toml.parse(raw);
	return parsed;
}

// Read all mustache files in the templates directory.
async function readTemplates() {
	const options = { "encoding": "utf8" };
	const templateFiles = await fs.opendir(templateDir);
	const templates = {};
	const promises = [];
	for await (const template of templateFiles) {
		if (template.name.endsWith(".mustache")) {
			const baseName = template.name.replace(".mustache", "");
			const filePath = path.join(templateDir, template.name);
			const promise = fs.readFile(filePath, options).then(contents => templates[baseName] = contents);
			promises.push(promise);
		}
	}

	// Wait for all the files to be read and added to the templates object.
	await Promise.all(promises);
	
	return templates;
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

// Create computed fields, normalize data, and cleanup values
async function expandProjectData(config) {
	// Computed id field
	Object.keys(config.projects).forEach(id => config.projects[id].id = id);

	// Normalize language field to always be an array.
	const allProjects = Object.values(config.projects);
	allProjects.forEach(project => {
		if (typeof project.language === "string") {
			project.language = [project.language];
		}
	});

	// Expand image from a string to an object
	const imagePromises = allProjects.filter(project => project.image)
		.map(async project => project.image = resolveImage(project, project.image));

	const screenshotPromises = allProjects.filter(project => project.screenshots)
		.flatMap(project => project.screenshots.map(async screenshot => {
			Object.assign(screenshot, await resolveImage(project, screenshot.image));
		}));

	await Promise.all(imagePromises);
	await Promise.all(screenshotPromises);
}

// TODO: Error messages if an image can't be found!
async function resolveImage(project, filename) {
	const imagesDir = path.join("resources", "images");
	const image = { name: filename };
	const firstPath = path.join(imagesDir, project.id, filename);
	const secondPath = path.join(imagesDir, filename);
	try {
		const dim = await imageSize(firstPath);
		image.url = "/" + project.id + "/" + filename;
		image.width = dim.width;
		image.height = dim.height;
	} catch (e) {
		if (e.code === "ENOENT") {
			const dim = await imageSize(secondPath);
			image.url = "/" + filename;
			image.width = dim.width;
			image.height = dim.height;
		}
	}
	return image;
}

// Transform the human-friendly config file into a more computer-friendly
// format.
function buildIndexPage(config) {
	// Categorize projects.
	const featured = [];
	const normal = [];
	config.featured.forEach(name => featured.push(config.projects[name]));
	config.not_featured.forEach(name => normal.push(config.projects[name]));

	return {
		featured: featured,
		normalTable: buildNormalProjectSection(normal),
		isIndex: true,
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

function buildProjectPage(project) {
	const ret = {
		isProject: true,
	};
	return Object.assign(ret, project);
}

async function main() {
	const templatePromises = readTemplates();
	const config = await readProjectData();
	validateConfigFile(config);
	await expandProjectData(config);
	const projects = Object.values(config.projects);

	var pages = [{
		view: buildIndexPage(config),
		template: "index",
		outFile: "index.html"
	}];
	pages = pages.concat(projects.map(project => {return {
		view: buildProjectPage(project),
		template: "projectPage",
		outFile: path.join("projects", project.id + ".html"),
	}}));
	
	await fs.mkdir(path.join(outputDir, "projects"), {recursive: true});
	const templates = await templatePromises;
	const pagePromises = pages.map(async page => {
		if (!(page.template in templates)) {
			throw {
				message: "Invalid template name",
				name: page.template,
				templates: templates
			};
		}
		const rendered = mustache.render(templates[page.template], page.view, templates);
		await fs.writeFile(path.join(outputDir, page.outFile), rendered);
		console.log(page.outFile + " generated.");
	});
	await Promise.all(pagePromises);
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});

