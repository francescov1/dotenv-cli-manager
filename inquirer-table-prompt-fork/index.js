const chalk = require("chalk");
const cliCursor = require("cli-cursor");
const figures = require("figures");
const Base = require("inquirer/lib/prompts/base");
const Choices = require("inquirer/lib/objects/choices");
const observe = require("inquirer/lib/utils/events");
const Paginator = require("inquirer/lib/utils/paginator");
const Table = require("cli-table");
const { map, takeUntil } = require("rxjs/operators");
const { spawn } = require("child_process");
const fs = require("fs");
const mkdirp = require("mkdirp");

const inquirer = require("inquirer");

// TODO: if someones value overwrites somethign in defaults, should highlight it to warn user
class TablePrompt extends Base {
  /**
   * Initialise the prompt
   *
   * @param  {Object} questions
   * @param  {Object} rl
   * @param  {Object} answers
   */
  constructor(questions, rl, answers) {
    super(questions, rl, answers);

    // hide columns by default, add `alias` to show/hide values
    const colums = this.opt.columns.map(column => {
      return { ...column, isHidden: true, alias: column.name[0].toLowerCase() };
    });

    this.columns = new Choices(colums, []);
    this.pointer = 0;
    this.horizontalPointer = 0;
    this.rows = new Choices(this.opt.rows, []);
    this.values = this.columns.filter(() => true).map(() => undefined);

    this.isEditingValue = false;

    this.pageSize = this.opt.pageSize || 5;
  }

  /**
   * Start the inquirer session
   *
   * @param  {Function} callback
   * @return {TablePrompt}
   */
  _run(callback) {
    this.done = callback;

    const events = observe(this.rl);
    const validation = this.handleSubmitEvents(
      events.line.pipe(map(this.getCurrentValue.bind(this)))
    );
    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));

    events.keypress.forEach(({ key }) => {
      switch (key.name) {
        case "left":
          return this.onLeftKey();

        case "right":
          return this.onRightKey();
      }
    });

    events.normalizedUpKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onUpKey.bind(this));
    events.normalizedDownKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onDownKey.bind(this));
    events.spaceKey
      .pipe(takeUntil(validation.success))
      .forEach(this.onSpaceKey.bind(this));

    events.keypress
      .pipe(takeUntil(validation.success))
      .forEach(this.onKeyPress.bind(this));

    if (this.rl.line) {
      this.onKeypress();
    }

    cliCursor.hide();
    this.render();

    // create temp dir for editing
    // mkdirp('/tmp/env-editor')
    // .then(made => console.log(`made directories, starting with ${made}`))

    return this;
  }

  getCurrentValue() {
    // const currentValue = [];

    // this.rows.choices.forEach((row, rowIndex) => {
    //   currentValue.push(this.values[rowIndex]);
    // });

    // console.log("getCurrentValue")
    // console.log("retruning: ", { rows: this.rows.choices, columns: this.columns.choices })
    // return currentValue;

    if (this.isEditingValue) {
      this.isEditingValue = false;
      return {
        rows: this.rows.choices.map(choice => ({
          name: choice.name,
          values: choice.values
        })),
        columns: this.columns.choices.map(choice => ({
          name: choice.name,
          value: choice.value
        }))
      };
    } else return null;
  }

  getSelectedValue() {
    return this.rows.choices[this.pointer].values[this.horizontalPointer];
  }

  setSelectedValue(value) {
    this.rows.choices[this.pointer].values[this.horizontalPointer] = value;
  }

  onDownKey() {
    if (this.isEditingValue) return;

    const length = this.rows.realLength;

    this.pointer = this.pointer < length - 1 ? this.pointer + 1 : this.pointer;
    this.render();
  }

  onEnd(state) {
    // this.status = "answered";

    this.screen.done();
    // cliCursor.show();
    this.done(state.value);
    // this.render();
  }

  onError(state) {
    this.render(state.isValid);
  }

  onLeftKey() {
    if (this.isEditingValue) {
      // this.editorPosition = this.editorPosition > 0 ? this.editorPosition-1 : this.editorPosition
      return;
    } else {
      const length = this.columns.realLength;

      this.horizontalPointer =
        this.horizontalPointer > 0 ? this.horizontalPointer - 1 : length - 1;
    }

    this.render();
  }

  onRightKey() {
    if (this.isEditingValue) {
      // const valLength = this.getSelectedValue().length
      // this.editorPosition = this.editorPosition < valLength ? this.editorPosition+1 : this.editorPosition
      return;
    } else {
      const length = this.columns.realLength;

      this.horizontalPointer =
        this.horizontalPointer < length - 1 ? this.horizontalPointer + 1 : 0;
    }

    this.render();
  }



  async onKeyPress(keyPressed) {
    if (this.isEditingValue) return;

    // check if this was a "hide" key & hide the associated column if so
    const val = keyPressed.value;
    const column = this.columns.find(column => column.alias === val);
    if (column) {
      column.isHidden = !column.isHidden;
      this.render();
      return
    }

    // TODO: handle cmd+backspace to delete var from all envs

    // check if this was a "backspace key"
    if (val === '\x7F') {
      const { name } = this.rows.choices[this.pointer];
      this.isEditingValue = true;

      const { name: envName } = this.columns.choices[this.horizontalPointer];
      
      const message = `Clear variable "${name}" from environment "${envName}"?`
      
      const answer = await this.launchConfirmPrompt(message);
      if (answer === true) {
        this.rows.choices[this.pointer].values[this.horizontalPointer] = ''
        // this.render();
        return
      }
    }
    
  }

  // launchVim() {
  //   const value = this.getSelectedValue();

  //   const tempFilePath = "/tmp/env-editor/vi-session.txt"

  //   fs.writeFileSync(tempFilePath, value, "utf8")

  //   const vim = spawn("vim", [tempFilePath], { stdio: "inherit" });

  //   // TODO: add support to only show one value, rather than entire column

  //   vim.on("exit", (e, code) => {
  //     console.log("finished " + code);

  //     this.isEditingValue = false;
  //     const newValue = fs.readFileSync(tempFilePath, "utf8")

  //     // TODO: delete temp file immediately

  //     this.setSelectedValue(newValue.trim())
  //     this.render()
  //   });
  // }

  launchEditor(name, currentValue) {
    return inquirer
      .prompt([
        {
          type: "input",
          name,
          message: `\n${name} =`,
          // default: currentValue,
          prefix: "",
          suffix: "",
          transformer: (input, _options) => {
            if (input === "") return currentValue;

            return input;
          }
        }
      ])
      .then(answers => answers[name])
      .catch(err => {
        if (err.isTtyError) {
          console.error("isTtyError: ", err);
          // Prompt couldn't be rendered in the current environment
        } else {
          // Something else went wrong
          console.error("Error: ", err);
        }
      });
  }

  launchConfirmPrompt(message) {
    return inquirer
      .prompt([
        {
          type: "confirm",
          name: "answer",
          message: `\n${message}`
        }
      ])
      .then(answers => answers.answer)
      .catch(err => {
        if (err.isTtyError) {
          console.error("isTtyError: ", err);
          // Prompt couldn't be rendered in the current environment
        } else {
          // Something else went wrong
          console.error("Error: ", err);
        }
      });
  }


  // TODO: key to add and delete variable

  async onSpaceKey() {
    if (this.isEditingValue) return;

    this.isEditingValue = true;
    // console.log("coords: ", { pointer: this.pointer, horizontalPointer: this.horizontalPointer})
    // console.log('pointer at row', this.rows.choices[this.pointer])

    const { name, values } = this.rows.choices[this.pointer];
    const value = values[this.horizontalPointer];

    const answer = await this.launchEditor(name, value);
    // console.log("Value of \"" + name + "\" updated: \"" + value + "\" -> \"" + answer + "\"");
    this.setSelectedValue(answer);
    // this.isEditingValue = false
    // this.render();

    // this.editorPosition = this.getSelectedValue().length

    // const value = this.columns.get(this.horizontalPointer).value;

    // this.values[this.pointer] = value;
    // this.render();
  }

  onUpKey() {
    if (this.isEditingValue) return;

    this.pointer = this.pointer > 0 ? this.pointer - 1 : this.pointer;
    this.render();
  }

  paginate() {
    const middleOfPage = Math.floor(this.pageSize / 2);
    const firstIndex = Math.max(0, this.pointer - middleOfPage);
    const lastIndex = Math.min(
      firstIndex + this.pageSize - 1,
      this.rows.realLength - 1
    );
    const lastPageOffset = this.pageSize - 1 - lastIndex + firstIndex;

    return [Math.max(0, firstIndex - lastPageOffset), lastIndex];
  }

  render(error) {
    let message = this.getQuestion();
    let bottomContent = "";

    message +=
      "\n(Press " +
      chalk.cyan.bold("<l> <d> <p> <t>") +
      " to show/hide column, " +
      chalk.cyan.bold("<space>") +
      " to select, " +
      chalk.cyan.bold("<Up and Down>") +
      " to move rows, " +
      chalk.cyan.bold("<Left and Right>") +
      " to move columns)";

    const [firstIndex, lastIndex] = this.paginate();

    const table = new Table({
      head: [
        chalk.reset.dim(
          `${firstIndex + 1}-${lastIndex + 1} of ${this.rows.realLength}`
        )
      ].concat(
        this.columns.choices.map((column, columnIndex) => {
          return chalk.reset.bold(
            `${column.name} (${column.alias}) ${column.isHidden ? "🔒" : "👀"}`
          );
        })
      )
    });

    this.rows.forEach((row, rowIndex) => {
      if (rowIndex < firstIndex || rowIndex > lastIndex) return;

      const columnValues = [];

      this.columns.forEach((column, columnIndex) => {
        const isSelected =
          this.status !== "answered" &&
          this.pointer === rowIndex &&
          this.horizontalPointer === columnIndex;
        // const value =
        //   column.value === this.values[rowIndex]
        //     ? figures.radioOn
        //     : figures.radioOff;

        const value = row.values[columnIndex];

        let valueLabel;
        // if (this.isEditingValue && isSelected) {
        //   valueLabel = value.slice(0, this.editorPosition) + "|" + value.slice(this.editorPosition);
        // }
        // else {
        valueLabel = column.isHidden
          ? new Array(value.length).fill(figures.star).join("")
          : value;
        // }

        columnValues.push(
          `${isSelected ? "[" : " "} ${valueLabel} ${isSelected ? "]" : " "}`
        );
      });

      const chalkModifier =
        this.status !== "answered" && this.pointer === rowIndex
          ? chalk.reset.bold.cyan
          : chalk.reset;

      table.push({
        [chalkModifier(row.name)]: columnValues
      });
    });

    message += "\n\n" + table.toString();

    if (error) {
      bottomContent = chalk.red(">> ") + error;
    }

    this.screen.render(message, bottomContent);
  }
}

module.exports = TablePrompt;
