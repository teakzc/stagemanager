_G.NOCOLOR = true

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Jest = require(ReplicatedStorage.rbxts_include.node_modules["@rbxts"].jest.src :: ModuleScript)

local setup = require((script.Parent :: Instance):FindFirstChild("setup") :: ModuleScript)

local status, result = Jest.runCLI(script, {
	verbose = false,
	ci = false,
	setupFiles = { setup },
}, {
	ReplicatedStorage.Package.tests,
}):awaitStatus()

if status == "Rejected" then
	print(result)
	error("Tests failed")
end

