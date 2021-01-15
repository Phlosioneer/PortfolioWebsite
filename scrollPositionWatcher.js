"use strict";

var scrolling = false;
var anchors = [];

function scrollEventListener() {
	if (!scrolling) {
		scrolling = true;
		window.requestAnimationFrame(function() {
			handleScrollEvent();
			scrolling = false;
		});
	}
}

function handleScrollEvent() {
	var lastMatchingAnchor = null;
	anchors.forEach(anchor => {
		if (anchor.getBoundingClientRect().y < window.scrollY) {
			lastMatchingAnchor = anchor;
		}
	});
	if (!lastMatchingAnchor) {
		return;
	}
	if (!lastMatchingAnchor.id) {
		console.error("Found a section-link element without an id!", lastMatchingAnchor);
		return;
	}
	// Using "null" references the top of the history stack, or creates an entry
	// if the stack is empty.
	history.replaceState(null, null, "#" + lastMatchingAnchor.id);
}

anchors = Array.from(document.getElementsByClassName("section-link"));
handleScrollEvent();
document.addEventListener("scroll", scrollEventListener);

