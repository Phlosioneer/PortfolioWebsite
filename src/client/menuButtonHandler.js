"use strict";

document.addEventListener("DOMContentLoaded", () => {
	var burger = document.getElementById("navbar-burger");
	burger.onclick = () => {
		var target = document.getElementById(burger.getAttribute("data-target"));
		target.classList.toggle("is-active");
	};
};

