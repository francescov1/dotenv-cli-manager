import inquirer from 'inquirer';
import fs from "fs";
import inquirerTablePrompt from "../inquirer-table-prompt/index.js";

inquirer.registerPrompt("table", inquirerTablePrompt);

// TODO: detect .env files locally, or pull from  config
const envs = ["local", "development", "production", "test"]
const { rows, columns } = prepareInquirerData(envs);
runManager({ rows, columns }).then(() => { 
  // console.log("All done") 
});

async function runManager({ rows, columns }) {
  try {
    let answers = { rows, columns };
    while (true) {
      const newAnswers = await inquirer.prompt([
        {
          type: "table",
          name: "environment",
          message: "View or edit environment variables",
          ...answers
        }
      ]);

      if (!newAnswers?.environment) break;

      answers = newAnswers.environment;
    }
    
     const allJsonContent = convertAnswerToJson(answers)
     console.log("Done, writing response to .env file:")
    //  console.log(allJsonContent);
     Object.keys(allJsonContent).forEach(env => writeEnv(env, allJsonContent[env]))
    }
    catch(err) {
      console.error("Error: ", err)
    }
}

function convertAnswerToJson(answers) {
  const allJsonContent = {}
  answers.columns.forEach((col, i) => {
    const jsonContent = {}
    answers.rows.forEach(row => {
      jsonContent[row.name] = row.values[i]
    })

    allJsonContent[col.value] = jsonContent
  })

  return allJsonContent;
}
  
function prepareInquirerData(envs) {
  const allJsonContent = {};

  const columns = [];
  let varNames = [];

  envs.forEach(env => {
    const jsonContent = readEnv(env);
    varNames = [...varNames, ...Object.keys(jsonContent)]
    allJsonContent[env] = jsonContent;
    columns.push({ name: `${env.charAt(0).toUpperCase()}${env.slice(1)}`, value: env })
  });

  // remove duplicates
  varNames = [...new Set(varNames)]
  const rows = varNames.map(varName => {
    const values = [];
    envs.forEach((env) => {
      values.push(allJsonContent[env][varName])
    });

    return {
      name: varName,
      values
    }
  })
  
  // console.log({ rows, columns })
  return { rows, columns }
  // return {
  //   columns: [
  //     {
  //         name: "Local",
  //         value: "local"
  //     },
  //     {
  //       name: "Development",
  //       value: "development"
  //     },
  //     {
  //       name: "Production",
  //       value: "production"
  //     },
  //     {
  //       name: "Test",
  //       value: "test"
  //     },
  //   ],
  //   rows: [
  //     {
  //       name: "NODE_ENV",
  //       values: ["development", "development", "production", "test"]
  //     },
  //     {
  //       name: "API_URL",
  //       values: ["http://locahost:8080", "https://example.com", "https://production.example.com", "http://locahost:8080"]
  //     },
  //     {
  //       name: "FB_ID",
  //       values: ["1234567890123456", "1234567890123456", "1234567890123456", "1234567890123456"]
  //     }
  //   ]
  // }
}

function readEnv(env) {
  const rawDotenv = fs.readFileSync(`.env.${env}`, "utf8");
  // TODO: If file doesnt exist, create it or just ignore it
  const jsonContent = convertRawDotenvToJson(rawDotenv);
  return jsonContent;
}

function convertRawDotenvToJson(rawDotenv) {
  const jsonContent = {};
  rawDotenv.split("\n").forEach(line => {
    if (line.startsWith("#")) return;
    if (!line.includes("=")) return;

    const [varName, value] = line.split("=")
    jsonContent[varName] = value;
  });

  return jsonContent;
}

/**
 * 
 * // TODO: in the future we may want to edit env values in place, so that the user can add comments and special formatting to their .env files without being overwritten
 * 
 * @param {*} jsonContent 
 * ```json
 * {
 *    "NODE_ENV": "development",
 *    "API_URL": "http://localhost:8080"
 * }
 * ```
 * 
 * @param {*} filepath 
 */
function writeEnv(env, jsonContent) {
  let fileStr = "";
  Object.keys(jsonContent).forEach(varName => {
    fileStr += `${varName}=${jsonContent[varName]}\n`;
  })

  fs.writeFileSync(`.env.${env}`, fileStr);
}