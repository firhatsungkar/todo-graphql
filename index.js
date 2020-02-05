const { ApolloServer, gql } = require("apollo-server");
const { todos } = require("./db");
const compareDesc = require("date-fns/compareDesc");
const crypto = require("crypto");

const secret = process.env.SECRET_KEY || "supersecret";

const port = process.env.PORT || 4000;

const isValidDate = date => !isNaN(new Date(date).getTime());

const typeDefs = gql`
  type Todo {
    id: String
    description: String
    completed: Boolean
    deadline: String
  }
  type Query {
    todos(first: Int): [Todo]
    todo(id: String): Todo
  }
  type Mutation {
    addTodo(description: String!, deadline: String!): Todo
    deleteTodo(id: String!): Todo
  }
`;

const resolvers = {
  Query: {
    todos: (_, { first }) => {
      const limit = parseInt(first) || 10;
      return [...todos]
        .sort((prev, next) =>
          compareDesc(new Date(prev.deadline), new Date(next.deadline))
        )
        .slice(0, limit);
    },
    todo: (_, { id }) => {
      return todos.find(todo => todo.id === id);
    }
  },
  Mutation: {
    addTodo: (_, args) => {
      let description;
      let deadline;
      if (args.description.length < 0) {
        throw new Error("Description is empty.");
      }
      if (!isValidDate(args.deadline)) {
        throw new Error("Deadline is not valid iso date.");
      }
      description = args.description;
      deadline = new Date(args.deadline).toISOString();
      const id = crypto
        .createHmac("sha256", secret)
        .update(String(Date.now()))
        .digest("hex");
      const newTodo = { id, description, deadline, completed: false };
      todos.push(newTodo);
      return newTodo;
    },
    deleteTodo: (_, { id }) => {
      const selectedTodo = todos.find(todo => todo.id === id);
      const indexTodo = selectedTodo ? todos.indexOf(selectedTodo) : -1;
      if (!selectedTodo && indexTodo < 0) {
        throw new Error(`Todo with id ${id} not found.`);
      }

      todos.splice(indexTodo, 1);

      return null;
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });

// The `listen` method launches a web server.
server.listen({ port }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});
