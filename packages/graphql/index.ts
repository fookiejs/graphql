import { resolve_type } from "./utils/resolve_types"
import * as lodash from "lodash"
import { resolve_input } from "./utils/resolve_input"
import { create_query_resolver } from "./utils/create_query_resolver"

const filter_types = `
input string_filter {
  eq: String
  not_eq: String
  in: [String]
  not_in: [String]
  like: String
}

input integer_filter {
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
                typeFields[`${field}_entity`] = { value: `${model.schema[field].relation.name}` }
            }

            typeFields[field] = { value: temp_type }
            inputFields[field] = { value: temp_input }

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

        typeDefs.input[model.name + "_filter"] = inputFields
        typeDefs.type[model.name] = typeFields
        typeDefs.Query[model.name] = { value: `${model.name}_filter` }

        resolvers.Query[model.name] = create_query_resolver(Fookie, model)
    }

    for (const model of Fookie.Core.models) {
        for (const field of lodash.keys(model.schema)) {
            if (model.schema[field].relation) {
                typeDefs.type[model.schema[field].relation.name]["all_" + model.name] = {
                    value: `[${model.name}]`,
                    all: true,
                    model: model,
                }
                if (!resolvers[model.schema[field].relation.name]) {
                    resolvers[model.schema[field].relation.name] = {}
                }
                resolvers[model.schema[field].relation.name]["all_" + model.name] = async function (parent, payload, b, c) {
                    const query = lodash.omit(payload.query, field)
                    const response = await Fookie.Core.run({
                        model: model,
                        method: Fookie.Method.Read,
                        query: {
                            filter: {
                                [field]: parent[model.database.pk],
                                ...query,
                            },
                        },
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
                result += `  ${field}(query: ${model.name}_filter): ${typeDefs.type[typeName][field].value}\n` //TODO
            } else {
                result += `  ${field}: ${typeDefs.type[typeName][field].value}\n`
            }
        }

        result += "}\n\n"
    }

    //INPUT
    for (const typeName in typeDefs.input) {
        result += `input ${typeName} {\n`

        for (const field in typeDefs.input[typeName]) {
            result += `  ${field}: ${typeDefs.input[typeName][field].value}\n`
        }

        result += "}\n\n"
    }

    console.log(result)

    return {
        typeDefs: `
        ${filter_types}
        ${result}
        `,
        resolvers,
    }
}
