#!/usr/bin/env node

const inquirer = require('inquirer');
const glob = require("glob")
const inquirerTablePrompt = require("./inquirerTablePrompt");
const EnvFile = require('./envFile');

inquirer.registerPrompt("table", inquirerTablePrompt);

// TODO: cli - on first use, user can pass flag `--init` to be asked which envs they want 
// (show list of common ones and option for custom). Check local files and compare to chosen envs - if there are any conflicts then ask user if they want to 
// maintain local vars or wipe them and start fresh

const pattern = ".env.*";
const envPaths = glob.sync(pattern);
if (!envPaths.length) {
  console.warn(`No ${pattern} files found. To get started, create multiple files of the following format: ".env.{environment_name}" (ex: ".env.development")`)
  process.exit(0);
}

// get env names, filter out any encrypted envs
const envs = envPaths.map(filename => filename.split(".env.")[1]).filter(envName => !envName.includes(".enc"))
let envFiles = envs.map(env => new EnvFile(env));

const { rows, columns } = prepareInquirerData(envs);
runManager({ rows, columns }).then(() => { 
  // console.log("done!") 
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
     
     // TODO: give user option to print changes directly

     const allJsonContent = convertAnswerToJson(answers)
     const envs = Object.keys(allJsonContent)

     const confirmAnswers = await inquirer.prompt([
        {
          type: "confirm",
          name: "answer",
          message: `Write changes to files ".env.${envs.join(`", ".env.`)}"?`
        }
      ])

      if (confirmAnswers.answer === true) {
        console.log("💾  Saving changes")
        envFiles = envFiles.map(envFile => {
          envFile.injectChanges(allJsonContent[envFile.getEnv()])
          envFile.save()
          return envFile;
        })
      }
      else {
        // TODO: instead of throwing away changes, re-render the UI (user can always quit easily using ctrl-c)
        console.log("🗑  Throwing away changes")
      }
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

  envFiles.forEach(envFile => {
    const jsonContent = envFile.getJsonContent();
    const env = envFile.getEnv();

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