"use strict";

const path = require('path');
const fs = require('fs/promises');
const util = require('util');

const toml = require('toml');
const mustache = require('mustache');
const imageSize = util.promisify(require('image-size'));
const showdown = require('showdown');
const Typo = require('typo-js');

const templateDir = process.argv[2];
const outputDir = process.argv[3];

async function initSpellChecker() {
	const spellChecker = new Typo("en_US");
	const whitelistFile = await fs.readFile(path.join(".", "customSpellDictionary.txt"));
	const whitelist = whitelistFile.toString()
		.split('\n')
		.filter(word => word !== '' && word[0] != '#')
		.map(word => word.replace('\r', ''));
	return {
		whitelist: whitelist,
		checker: spellChecker
	};
}

function isNumeric(str) {
	return !!(str.match(/^\d*$/));
}

function fancySpellCheck(spellChecker, text, name) {
	if (text === undefined || text === null) {
		return;
	}
	if (name.includes("Repo")) {
		return;
	}
	// Remove markdown links.
	var newText = text.replace(/\[.*?\]\s*\(.*?\)/g, "");
	// Remove most punctuation.
	var newText = newText.replace(/[.*_,()?!:;"]/g, '');
	newText = newText.replace("/", " ");

	const words = newText.split(/\s/);
	const badWords = words
		.filter(word => word != '')
		.filter(word => !isNumeric(word))
		.filter(word => !spellChecker.checker.check(word))
		.filter(word => !spellChecker.whitelist.includes(word));

	badWords.forEach(word => {
		if (word.search('-') != -1) {
			// Check if this is two hyphenated words.
			const subwords = word.split("-").filter(word => word != '');
			var stillWrong = false;
			for (var i in subwords) {
				if (!spellChecker.checker.check(subwords[i]) && !spellChecker.whitelist.includes(subwords[i])) {
					stillWrong = true;
					break;
				}
			}
			if (!stillWrong) {
				return;
			}
		}
		const position = text.search(word);
		const line = text.substring(0, position).split('\n').length;
		console.warn(name + " line " + line + ": Misspelled word '" +  word + "'");
	});
}

async function readProjectData() {
	const mainFileRaw = await fs.readFile('resources/projects.toml');
	var mainFile;
	try {
		mainFile = await toml.parse(mainFileRaw);
	} catch (e) {
		throw {
			message: "Error while parsing projects.toml",
			error: e
		};
	}
	
	const allProjectNames = mainFile.featured.concat(mainFile.not_featured);
	mainFile.allProjectNames = allProjectNames;
	if (!mainFile.projects) {
		mainFile.projects = {};
	}

	const projectPromises = allProjectNames.map(async name => {
		const path = "resources/projects/" + name + "/project.toml";
		var projectFileRaw;
		try {
			projectFileRaw = await fs.readFile(path);
		} catch (e) {
			console.log("Warning: No project.toml for " + name);
			return;
		}

		try {
			mainFile.projects[name] = toml.parse(projectFileRaw);
		} catch (e) {
			throw {
				message: "Error while parsing " + path,
				error: e
			};
		}
	});

	await Promise.all(projectPromises);
	return mainFile;
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
async function expandProjectData(config, spellChecker) {
	// Computed id field
	Object.keys(config.projects).forEach(id => config.projects[id].id = id);

	const allProjects = Object.values(config.projects);
	
	// Expand the main image from a string to an object.
	const imagePromises = allProjects.filter(project => project.image)
		.map(async project => project.image = await resolveImage(project, project.image));

	// Do the same for screenshots.
	const screenshotPromises = allProjects.filter(project => project.screenshots)
		.flatMap(project => project.screenshots.map(async screenshot => {
			Object.assign(screenshot, await resolveImage(project, screenshot.image));
		}));

	// Process left-bar entries.
	allProjects.forEach(project => {
		if (!project.left_bar) {
			return;
		}
		const newLeftBar = [];
		Object.entries(project.left_bar).forEach(([name, value]) => {
			const leftBarEntry = { name: name };
			if (typeof value == "string") {
				leftBarEntry.text = value;
			} else {
				leftBarEntry.text = value.text;
				leftBarEntry.url = value.url;
			}
			newLeftBar.push(leftBarEntry);
		});
		project.raw_left_bar = project.left_bar;
		delete project.left_bar;
		project.leftBar = newLeftBar;
	});

	// Perform spellchecking
	allProjects.forEach(project => {
		fancySpellCheck(spellChecker, project.brief, project.id + " brief");
		fancySpellCheck(spellChecker, project.desc, project.id + " desc");
		if (project.screenshots) {
			project.screenshots.forEach(screenshot => {
				fancySpellCheck(spellChecker, screenshot.desc, project.id + " screenshot " + screenshot.image);
			});
		}
		if (project.leftBar) {
			project.leftBar.forEach(entry => {
				fancySpellCheck(spellChecker, entry.name, project.id + " left_bar");
				if (entry.text) {
					fancySpellCheck(spellChecker, entry.text, project.id + " left_bar " + entry.name);
				}
			});
		}
	});

	// Convert markdown into html.
	const converter = new showdown.Converter();
	const markdownPrefix = '<div class="markdown">';
	const markdownSuffix = '</div>';
	allProjects.forEach(project => {
		try {
			project.desc = markdownPrefix + converter.makeHtml(project.desc) + markdownSuffix;
		} catch (e) {
			throw {
				message: "Error while parsing project markdown",
				original: project.desc,
				error: e
			};
		}
		if (project.screenshots) {
			project.screenshots.forEach(screenshot => {
				try {
					screenshot.desc = markdownPrefix + converter.makeHtml(screenshot.desc) + markdownSuffix;
				} catch (e) {
					throw {
						message: "Error while parsing screenshot markdown",
						original: screenshot.desc,
						error: e
					};
				}
			});
		}
	});

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
	config.featured.filter(name => !config.projects[name].hidden)
		.forEach(name => featured.push(config.projects[name]));
	config.not_featured.filter(name => !config.projects[name].hidden)
		.forEach(name => normal.push(config.projects[name]));

	const ret = {
		featured: featured,
		normalTable: buildNormalProjectSection(normal),
		isIndex: true,
	};

	return ret;
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
	if (row.length != 0) {
		table.push({"normalProjects": row});
	}
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
	const spellCheckerPromise = initSpellChecker();
	const config = await readProjectData();
	validateConfigFile(config);
	const spellChecker = await spellCheckerPromise;
	await expandProjectData(config, spellChecker);
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
	console.error(util.inspect(error, {depth: null, colors: true}));
	process.exit(1);
});

