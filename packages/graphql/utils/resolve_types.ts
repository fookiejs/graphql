export const resolve_type = function (Fookie, field) {
    const required = field.required ? "!" : ""
    let response = "String"
    if (field.type === Fookie.Type.Integer) {
        response = `Int`
    } else if (field.type === Fookie.Type.Float) {
        response = `Float`
    } else if (field.type === Fookie.Type.Text) {
        response = `String`
    } else if (field.type === Fookie.Type.Boolean) {
        response = `Boolean`
    } else if (field.type === Fookie.Type.StringArray) {
        response = `[String]`
    } else if (field.type === Fookie.Type.FloatArray) {
        response = `[Float]`
    } else if (field.type === Fookie.Type.IntegerArray) {
        response = `[Int]`
    }
    return response + required
}
