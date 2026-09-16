Option Explicit

Dim shell, fileSystem, projectFolder
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")
projectFolder = fileSystem.GetParentFolderName(WScript.ScriptFullName)

shell.CurrentDirectory = projectFolder
shell.Run "cmd /c npm run dev", 0, False
WScript.Sleep 2500
shell.Run "http://localhost:3000", 1, False
