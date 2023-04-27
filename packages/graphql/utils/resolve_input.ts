export const resolve_input = function (type) {
    if (type === "Int") {
        return "integer_filter"
    } else if (type === "Float") {
        return "float_filter"
    } else if (type === "Boolean") {
        return "boolean_filter"
    } else if (type === "Date") {
        return "integer_filter"
    } else if (type === "Float") {
        return "float_filter"
    } else {
        return "string_filter"
    }
}
