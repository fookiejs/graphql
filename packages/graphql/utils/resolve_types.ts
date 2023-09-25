import { Type } from "fookie"

export const resolve_type = function (field) {
    const required = field.required ? "!" : ""
    let response = "String"
    if (field.type === Type.Integer) {
        response = `Int`
    } else if (field.type === Type.Float) {
        response = `Float`
    } else if (field.type === Type.Text) {
        response = `String`
    } else if (field.type === Type.Boolean) {
        response = `Boolean`
    } else if (field.type === Type.Array(Type.Text)) {
        response = `[String]`
    } else if (field.type === Type.Array(Type.Float)) {
        response = `[Float]`
    } else if (field.type === Type.Array(Type.Integer)) {
        response = `[Int]`
    }
    return response
}
