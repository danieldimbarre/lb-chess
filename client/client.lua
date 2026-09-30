local resourceName = GetCurrentResourceName()
local Config = json.decode(LoadResourceFile(resourceName, "config.json"))
local identifier = Config.identifier

local requestId = 0
local pending = {}
local registeredLocale

-- Phone <-> app registration ------------------------------------------------

-- "pt-br" / "pt-pt" -> "pt", everything else uses the English store text.
local function phoneLocale()
    local ok, settings = pcall(function()
        return exports["lb-phone"]:GetSettings()
    end)
    local locale = ok and type(settings) == "table" and settings.locale or Config.defaultLocale or "en"
    return tostring(locale):lower():sub(1, 2) == "pt" and "pt" or "en"
end

local function addApp()
    local locale = phoneLocale()
    local store = (Config.appStore or {})[locale] or {}
    registeredLocale = locale

    local added, errorMessage = exports["lb-phone"]:AddCustomApp({
        identifier = identifier,
        name = store.name or Config.name,
        description = store.description or Config.description,
        developer = Config.developer,
        defaultApp = Config.defaultApp,
        size = Config.size,
        ui = resourceName .. "/ui/dist/index.html",
        icon = "https://cfx-nui-" .. resourceName .. "/ui/dist/icon.svg",
        images = {
            "https://cfx-nui-" .. resourceName .. "/ui/dist/screenshot.svg"
        },
        fixBlur = true,
        onClose = function()
            -- Pending requests from a closed iframe would never be read.
            for id, cb in pairs(pending) do
                cb({ ok = false, error = "closed" })
                pending[id] = nil
            end
        end
    })

    if not added then
        print(("[%s] could not add app: %s"):format(resourceName, tostring(errorMessage)))
    end
end

CreateThread(function()
    while GetResourceState("lb-phone") ~= "started" do
        Wait(500)
    end

    addApp()
end)

-- Re-register with the right store text when the player switches the phone's language.
CreateThread(function()
    while true do
        Wait(5000)
        if registeredLocale and GetResourceState("lb-phone") == "started" and phoneLocale() ~= registeredLocale then
            exports["lb-phone"]:RemoveCustomApp(identifier)
            addApp()
        end
    end
end)

AddEventHandler("onResourceStart", function(resource)
    if resource == "lb-phone" then
        Wait(1000)
        addApp()
    end
end)

AddEventHandler("onResourceStop", function(resource)
    if resource == resourceName and GetResourceState("lb-phone") == "started" then
        exports["lb-phone"]:RemoveCustomApp(identifier)
    end
end)

-- UI -> server request relay ------------------------------------------------

RegisterNUICallback("req", function(body, cb)
    if type(body) ~= "table" or type(body.name) ~= "string" then
        return cb({ ok = false, error = "bad_request" })
    end

    requestId = requestId + 1
    local id = requestId
    pending[id] = cb

    TriggerServerEvent("lb-chess:req", id, body.name, body.data or {})

    SetTimeout(10000, function()
        if pending[id] then
            pending[id]({ ok = false, error = "timeout" })
            pending[id] = nil
        end
    end)
end)

RegisterNetEvent("lb-chess:res", function(id, result)
    local cb = pending[id]
    if not cb then return end

    pending[id] = nil
    cb(result)
end)

-- Server -> UI push relay ---------------------------------------------------

RegisterNetEvent("lb-chess:push", function(action, data)
    exports["lb-phone"]:SendCustomAppMessage(identifier, { action = action, data = data })
end)
