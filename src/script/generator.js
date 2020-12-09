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
		"featured": await featured,
		"normal": await normal
	};
}

function generateFeaturedSection(featuredCardTemplate, featuredProjects) {
	let ret = '';
	featuredProjects.forEach(project => {
		const rendered = mustache.render(featuredCardTemplate, project);
		ret += '<div class="column">' + rendered + '</div>';
	});
	return ret;
}

function generateNormalSection(normalCardTemplate, normalProjects) {
	const ancestorTile = '<div class="tile is-ancestor">';
	let ret = ancestorTile;
	for (let i = 0; i < normalProjects.length; i++) {
		if (i != 0 && i % 4 == 0) {
			ret += '</div>' + ancestorTile;
		}
		const project = normalProjects[i];
		const rendered = mustache.render(normalCardTemplate, project);
		ret += rendered;
	}
	ret += '</div>';
	return ret;
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

	return {
		"featured": featured,
		"normal": normal
	};
}

async function main() {
	const rawProjectData = readProjectData();
	const templatePromises = readTemplates();
	const projectData = organizeConfigFile(await rawProjectData);
	const templates = await templatePromises;
	featuredSection = generateFeaturedSection(templates.featured, projectData.featured);
	normalSection = generateNormalSection(templates.normal, projectData.normal);
	const fullPage = mustache.render(templates.index, {
		"featured": featuredSection,
		"normal": normalSection
	});
	await fs.writeFile("src/web/index.html", fullPage);
	console.log("src/web/index.html generated.");
}

main();

