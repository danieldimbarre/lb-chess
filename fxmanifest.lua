fx_version "cerulean"
game "gta5"
lua54 "yes"

name "lb-chess"
author "Daniel Dimbarre"
description "Chess app for LB Phone - online matchmaking, challenges, bots and analysis"
version "1.0.0"

client_script "client/client.lua"
server_script "server/dist/server.js"

files {
    "config.json",
    "ui/dist/**/*"
}

-- Blank page: NUI callbacks need a ui_page, the real app is loaded by lb-phone as an iframe.
ui_page "ui/dist/nui.html"

dependencies {
    "lb-phone",
    "oxmysql"
}
