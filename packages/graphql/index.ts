import { resolve_type } from "./utils/resolve_types"
import * as lodash from "lodash"
import { resolve_input } from "./utils/resolve_input"
import { create_query_resolver } from "./utils/create_query_resolver"

const filter_types = `
input string_filter {
  equals: String
  not_equals: String
  in: [String]
  not_in: [String]
  like: String
}

input integer_filter {
  equals: Int
  not_equals: Int
  in: [Int]
  not_in: [Int]
  gte: Int
  gt: Int
  lte: Int
  lt: Int
}

input float_filter {
  equals: Float
  not_equals: Float
  in: [Float]
  not_in: [Float]
  gte: Float
  gt: Float
  lte: Float
  lt: Float
}

input boolean_filter {
  equals: Boolean
}
`

export function create(Fookie) {
    const typeDefs = {
        input: {},
        type: {},
        Query: {},
    }

    const resolvers = {
        Query: {},
    }

    for (const model of Fookie.Core.models) {
        if (model.name === "Query") {
            throw Error("Model name can not be 'Query' ")
        }
        let typeFields = {}
        let inputFields = {}

        for (const field of lodash.keys(model.schema)) {
            const temp_type = resolve_type(Fookie, model.schema[field])
            const temp_input = resolve_input(temp_type)

            if (model.schema[field].relation) {
                typeFields[`${field}_entity`] = `${model.schema[field].relation.name}`
            }

            typeFields[field] = temp_type
            inputFields[field] = temp_input

            if (model.schema[field].relation) {
                resolvers[model.name] = {
                    [field + "_entity"]: async function (parent, query) {
                        const response = await Fookie.Core.run({
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

        typeDefs.input[model.name + "_payload"] = inputFields
        typeDefs.type[model.name] = typeFields
        typeDefs.Query[model.name] = `${model.name}_payload`

        resolvers.Query[model.name] = create_query_resolver(Fookie, model)
    }

    for (const model of Fookie.Core.models) {
        for (const field of lodash.keys(model.schema)) {
            if (model.schema[field].relation) {
                typeDefs.type[model.schema[field].relation.name]["all_" + model.name] = `[${model.name}]`
                if (!resolvers[model.schema[field].relation.name]) {
                    resolvers[model.schema[field].relation.name] = {}
                }
                resolvers[model.schema[field].relation.name]["all_" + model.name] = async function (parent, a, b, c) {
                    const response = await Fookie.Core.run({
                        model: model,
                        method: Fookie.Method.Read,
                        query: {
                            filter: {
                                [field]: parent[model.database.pk],
                            },
                        },
                    })
                    console.log(a)
                    return response.data
                }
            }
        }
    }

    let result = ""

    for (const category in typeDefs) {
        if (category === "Query") {
            result += "type Query {\n"
            for (const typeName in typeDefs[category]) {
                result += `  ${typeName}(payload: ${typeDefs[category][typeName]}): [${typeName}]\n`
            }
            result += "}\n\n"
        } else {
            for (const typeName in typeDefs[category]) {
                result += `${category} ${typeName} {\n`

                for (const field in typeDefs[category][typeName]) {
                    result += `  ${field}: ${typeDefs[category][typeName][field]}\n`
                }

                result += "}\n\n"
            }
        }
    }
    return {
        typeDefs: `
        ${filter_types}
        ${result}
        `,
        resolvers,
    }
}
