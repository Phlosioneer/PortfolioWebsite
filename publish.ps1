
# Expects the website's folder as a parameter
if ( $args.Length -eq 0 )
{
	write-output "Expects path to subtree as first parameter"
	exit
}
# Doesn't expect any other parameters.
if ( $args.Length -ne 1)
{
	write-output "No more than one parameter."
	exit
}

# From https://stackoverflow.com/a/34286537/883130
$unixyPath = (($args[0] -replace "\\", "/") -replace ":", "").ToLower().Trim("/")

write-output "git subtree split --prefix $unixyPath master"
$treeRef = git subtree split --prefix $unixyPath master
$treeRef = $treeRef + ":refs/heads/gh-pages"

write-output "git push origin $treeRef --force"
git push origin $treeRef --force


