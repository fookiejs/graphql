import { resolve_type } from "./utils/resolve_types"
import * as lodash from "lodash"
import { resolve_input } from "./utils/resolve_input"
import { Fookie } from "fookie-types"
const filter_types = `
input string_filter {
  eq: String
  not_eq: String
  in: [String]
  not_in: [String]
  like: String
}

input int_filter {
  eq: Int
  not_eq: Int
  in: [Int]
  not_in: [Int]
  gte: Int
  gt: Int
  lte: Int
  lt: Int
}

input float_filter {
  eq: Float
  not_eq: Float
  in: [Float]
  not_in: [Float]
  gte: Float
  gt: Float
  lte: Float
  lt: Float
}

input boolean_filter {
  eq: Boolean
}
`

export function create(Fookie: Fookie) {
    const typeDefs = {
        input: {},
        type: {},
        Query: {},
        Mutation: {},
    }

    const resolvers = {
        Query: {},
        Mutation: {},
    }

    for (const model of Fookie.Core.models) {
        if (model.name === "Query") {
            throw Error("Model name can not be 'Query' ")
        }
        const typeFields = {}
        const inputFields = {}

        for (const field of lodash.keys(model.schema)) {
            const temp_type = resolve_type(Fookie, model.schema[field])
            const temp_input = temp_type

            if (model.schema[field].relation) {
                typeFields[`${field}_entity`] = { value: `${model.schema[field].relation.name}` }
            }

            typeFields[field] = { value: temp_type, field: model.schema[field] }
            inputFields[field] = { value: temp_input, field: model.schema[field] }

            if (model.schema[field].relation) {
                resolvers[model.name] = {
                    [field + "_entity"]: async function (parent, query, context, info) {
                        const response = await Fookie.Core.run({
                            token: context.token || "",
                            model: model.schema[field].relation,
                            method: Fookie.Method.Read,
                            query: {
                                filter: {
                                    [model.schema[field].relation.database.pk]: parent[field],
                                },
                            },
                        })

                        return response.data[0]
                    },
                }
            }
        }

        typeDefs.input[model.name] = inputFields
        typeDefs.type[model.name] = typeFields
        typeDefs.Query[model.name] = { value: `${model.name}_query` }

        resolvers.Query[model.name] = async function (parent, { query }, context, info) {
            const response = await Fookie.Core.run({
                token: context.token || "",
                model: model,
                method: Fookie.Method.Read,
                query: query,
            })

            return response.data
        }
    }

    for (const model of Fookie.Core.models) {
        for (const field of lodash.keys(model.schema)) {
            if (model.schema[field].relation) {
                typeDefs.type[model.schema[field].relation.name]["all_" + model.name] = {
                    value: `[${model.name}]`,
                    all: true,
                    model: model,
                }

                typeDefs.type[model.schema[field].relation.name]["sum_" + model.name] = {
                    sum: true,
                    model: model,
                }

                typeDefs.type[model.schema[field].relation.name]["count_" + model.name] = {
                    count: true,
                    model: model,
                }

                if (!resolvers[model.schema[field].relation.name]) {
                    resolvers[model.schema[field].relation.name] = {}
                }

                resolvers[model.schema[field].relation.name]["all_" + model.name] = async function (
                    parent,
                    payload,
                    context,
                    info
                ) {
                    const query: any = lodash.omit(payload.query, field)
                    if (!query.filter) {
                        query.filter = {}
                    }

                    query.filter[field] = parent[model.database.pk]

                    const response = await Fookie.Core.run({
                        token: context.token || "",
                        model: model,
                        method: Fookie.Method.Read,
                        query: query,
                    })

                    return response.data
                }
                resolvers[model.schema[field].relation.name]["sum_" + model.name] = async function (
                    parent,
                    payload,
                    context,
                    info
                ) {
                    const query: any = lodash.omit(payload.query, field)
                    if (!query.filter) {
                        query.filter = {}
                    }

                    query.filter[field] = parent[model.database.pk]

                    const response = await Fookie.Core.run({
                        token: context.token || "",
                        model: model,
                        method: Fookie.Method.Sum,
                        query,
                        options: {
                            field: payload.field,
                        },
                    })

                    return response.data
                }
                resolvers[model.schema[field].relation.name]["count_" + model.name] = async function (
                    parent,
                    payload,
                    context,
                    info
                ) {
                    const query: any = lodash.omit(payload.query, field)
                    if (!query.filter) {
                        query.filter = {}
                    }

                    query.filter[field] = parent[model.database.pk]

                    const response = await Fookie.Core.run({
                        token: context.token || "",
                        model: model,
                        method: Fookie.Method.Count,
                        query,
                    })

                    return response.data
                }
            }
        }
    }

    let result = ""

    //QUERY
    result += "type Query {\n"

    for (const typeName in typeDefs.Query) {
        result += `  ${typeName}(query: ${typeDefs.Query[typeName].value}): [${typeName}]\n`
    }
    result += "}\n\n"

    //TYPE
    for (const typeName in typeDefs.type) {
        result += `type ${typeName} {\n`

        for (const field in typeDefs.type[typeName]) {
            if (typeDefs.type[typeName][field].all) {
                const model = typeDefs.type[typeName][field].model
                result += `  ${field}(query: ${model.name}_query): ${typeDefs.type[typeName][field].value}\n`
            } else if (typeDefs.type[typeName][field].sum) {
                const model = typeDefs.type[typeName][field].model
                result += `  ${field}(query: ${model.name}_query, field:String): Float\n`
            } else if (typeDefs.type[typeName][field].count) {
                const model = typeDefs.type[typeName][field].model
                result += `  ${field}(query: ${model.name}_query): Int\n`
            } else {
                result += `  ${field}: ${typeDefs.type[typeName][field].value}\n`
            }
        }

        result += "}\n\n"
    }

    // FILTER INPUT
    for (const typeName in typeDefs.input) {
        result += `input ${typeName}_filter {\n`

        for (const field in typeDefs.input[typeName]) {
            result += `  ${field}: ${resolve_input(typeDefs.input[typeName][field].value)}\n`
        }

        result += "}\n\n"
    }

    // FILTER WHERE
    for (const typeName in typeDefs.input) {
        result += `input ${typeName}_filter {\n`

        for (const field in typeDefs.input[typeName]) {
            result += `  ${field}: ${resolve_input(typeDefs.input[typeName][field].value)}\n`
        }

        result += "}\n\n"
    }

    // FILTER QUERY
    for (const typeName in typeDefs.input) {
        result += ` input ${typeName}_query {
            offset: Int,
            limit: Int,
            filter: ${typeName}_filter
        }`
    }

    // CREATE INPUT
    for (const typeName in typeDefs.input) {
        result += `input ${typeName}_input {\n`

        for (const field in typeDefs.input[typeName]) {
            result += `  ${field}: ${typeDefs.input[typeName][field].value}\n`
        }

        result += "}\n\n"
    }

    // Mutations type
    result += "type Mutation {\n"

    for (const typeName in typeDefs.input) {
        result += `  create_${typeName}(body: ${typeName}_input): ${typeName}\n`
        result += `  update_${typeName}(query: ${typeName}_query, body: ${typeName}_input): Boolean\n`
        result += `  delete_${typeName}(query: ${typeName}_query): Boolean\n`
        result += `  count_${typeName}(query: ${typeName}_query): Int\n`
        result += `  sum_${typeName}(query: ${typeName}_query , field: String): Float\n`

        resolvers.Mutation[`create_${typeName}`] = async function (parent, { body }, context) {
            const response = await Fookie.Core.run({
                token: context.token || "",
                model: typeName,
                method: Fookie.Method.Create,
                body,
            })

            if (!response.status) {
                throw Error(response.error)
            }

            return response.data
        }

        resolvers.Mutation[`update_${typeName}`] = async function (_, { query, body }, context) {
            const response = await Fookie.Core.run({
                token: context.token || "",
                model: typeName,
                method: Fookie.Method.Update,
                query,
                body: body,
            })
            if (!response.status) {
                throw Error(response.error)
            }

            return response.data
        }

        resolvers.Mutation[`delete_${typeName}`] = async function (_, { query }, context) {
            const response = await Fookie.Core.run({
                token: context.token || "",
                model: typeName,
                method: Fookie.Method.Delete,
                query,
            })
            if (!response.status) {
                throw Error(response.error)
            }
            return response.data
        }

        resolvers.Mutation[`count_${typeName}`] = async function (_, { query }, context) {
            const response = await Fookie.Core.run({
                token: context.token || "",
                model: typeName,
                method: Fookie.Method.Count,
                query,
            })
            if (!response.status) {
                throw Error(response.error)
            }
            return response.data
        }

        resolvers.Mutation[`sum_${typeName}`] = async function (_, { query, field }, context) {
            const response = await Fookie.Core.run({
                token: context.token || "",
                model: typeName,
                method: Fookie.Method.Sum,
                query,
                options: {
                    field,
                },
            })
            if (!response.status) {
                throw Error(response.error)
            }
            return response.data
        }
        result += "\n"
    }

    result += "}\n\n"

    //    console.log(result)

    return {
        typeDefs: `
        ${filter_types}
        ${result}
        `,
        resolvers,
    }
}
