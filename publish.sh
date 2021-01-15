#!/bin/bash

# Expects the website's folder as a parameter.
if [[ -z $1 ]]
then
	echo "Expects path to subtree as first parameter."
	exit -1
fi
# Doesn't expect any other parameters.
if [[ -n "$2$3$4" ]]
then
	echo "No more than one parameter."
	exit -2
fi

git push origin `git subtree split --prefix "$1" master`:gh-pages --force
