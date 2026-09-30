local resourceName = GetCurrentResourceName()
local Config = json.decode(LoadResourceFile(resourceName, "config.json"))
local identifier = Config.identifier

local requestId = 0
local pending = {}

-- Phone <-> app registration ------------------------------------------------

local function addApp()
    local added, errorMessage = exports["lb-phone"]:AddCustomApp({
        identifier = identifier,
        name = Config.name,
        description = Config.description,
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
