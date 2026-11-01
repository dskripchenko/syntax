--[[ A module
     with a long comment ]]
local M = {}

-- Greets someone.
function M.greet(name)
  local text = [[
long string]] .. "Hello, " .. (name or 'world')
  return text, #text, nil, true
end

return M
