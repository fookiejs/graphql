export const create_query_resolver = function (Fookie, model) {
    return async function (parent, query, context, info) {
        const response = await Fookie.Core.run({
            token: "abc",
            model: model,
            method: Fookie.Method.Read,
            query: query,
        })

        return response.data
    }
}

export const create_type_resolver = function (Fookie, model) {
    return async function (parent, query, context, info) {
        const response = await Fookie.Core.run({
            token: "abc",
            model: model,
            method: Fookie.Method.Read,
            query: query,
        })

        return response.data
    }
}
