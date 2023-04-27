import { resolve_type } from "./utils/resolve_types"
import * as lodash from "lodash"
import { resolve_input } from "./utils/resolve_input"
import { create_query_resolver } from "./utils/create_query_resolver"

export function create(Fookie) {
    let typeDefs = `
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
    const resolvers = {
        Query: {},
    }

    for (const model of Fookie.Core.models) {
        let type = ``
        let input = ``
        for (const field of lodash.keys(model.schema)) {
            const temp_type = resolve_type(Fookie, model.schema[field])
            const temp_input = resolve_input(temp_type)
            if (model.schema[field].relation) {
                type += `
        ${field}_entity: ${model.schema[field].relation.name}
      `
            }
            type += `
      ${field}: ${temp_type}
    `
            input += `
      ${field}: ${temp_input}
    `

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
        typeDefs += `
    input ${model.name}_payload{
      ${input}
    }
    type ${model.name}{
       ${type}
    }
    type Query{
        ${model.name}(payload:${model.name}_payload): [${model.name}]
    }
    `

        resolvers.Query[model.name] = create_query_resolver(Fookie, model)
    }

    return {
        typeDefs,
        resolvers,
    }
}
