fs = require('fs/promises');
toml = require('toml');
mustache = require('mustache');

async function readProjectData() {
	const raw = await fs.readFile('resources/projects.toml');
	const parsed = await toml.parse(raw);
	return parsed;
}

async function readTemplates() {
	const options = { "encoding": "utf8" };
	const index = fs.readFile('src/templates/index.mustache', options);
	const featured = fs.readFile('src/templates/featuredCard.mustache', options);
	const normal = fs.readFile('src/templates/normalCard.mustache', options);
	return {
		"index": await index,
		"featuredCard": await featured,
		"normalCard": await normal
	};
}

// Transform the human-friendly config file into a more computer-friendly
// format.
function organizeConfigFile(config) {
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
	
	// Normalize data.
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

	// Organize the normal projects into rows of 4.
	const normalTable = [];
	var row = [];
	normal.forEach(project => {
		row.push(project);
		if (row.length == 4) {
			normalTable.push({"normalProjects": row});
			row = [];
		}
	});

	return {
		"featured": featured,
		"normalTable": normalTable
	};
}

async function main() {
	const rawProjectData = readProjectData();
	const templatePromises = readTemplates();
	const projectData = organizeConfigFile(await rawProjectData);
	const templates = await templatePromises;
	const fullPage = mustache.render(templates.index, projectData, templates);
	await fs.writeFile("src/web/index.html", fullPage);
	console.log("src/web/index.html generated.");
}

main();

