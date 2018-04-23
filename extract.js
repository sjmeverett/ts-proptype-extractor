const Module = require('module');
const React = require('react');
const _ = require('lodash');
const fs = require('fs');
const typescriptFormatter = require('typescript-formatter');
const commander = require('commander');

const _require = Module.prototype.require;

function propType(type, args) {
  const fn = (...args) => propType(type, args);
  fn.type = type;
  fn.args = args;
  fn.required = false;
  fn.isRequired = { ...fn, required: true };
  return fn;
}

const PropTypes = new Proxy(
  {},
  {
    get(obj, prop) {
      return prop === 'default' ? PropTypes : propType(prop);
    }
  }
);

// monkey patch require to return a prop-types that's actually inspectable
Module.prototype.require = function(path) {
  return path === 'prop-types' ? PropTypes : _require.call(this, path);
};

// turn our version of a prop-type into a typescript type
function typeToString(type) {
  switch (type.type) {
    case 'array':
      return 'any[]';
    case 'bool':
      return 'boolean';
    case 'func':
      return 'Function';
    case 'number':
      return 'number';
    case 'object':
      return 'object';
    case 'string':
      return 'string';
    case 'node':
      return 'React.ReactNode';
    case 'oneOf':
      return type.args[0].map(arg => `'${arg}'`).join(' | ');
    case 'oneOfType':
      return type.args[0].map(typeToString).join(' | ');
    case 'arrayOf':
      return typeToString(type.args[0]) + '[]';
    case 'objectOf':
      return `{ [key: string]: ${typeToString(type.args[0])} }`;
    case 'element':
      return 'React.ReactElement<any>';
    case 'shape':
      return `{
        ${_.map(
          type.args[0],
          (type, prop) =>
            `${prop}${type.required ? '' : '?'}: ${typeToString(type)}`
        ).join(';\n')};
      }`;
    case 'any':
      return 'any';
    case undefined:
      return 'any';
    default:
      console.error(`can't convert ${type.type}`);
      process.exit(1);
  }
}

function extractTypes(moduleName, outputPath) {
  if (!moduleName || !outputPath) {
    console.error('You must specifify moduleName and outputPath');
    process.exit(1);
  }

  const components = require(moduleName);

  const moduleStr = `declare module '${moduleName}' {
    import * as React from 'react';

    ${_.map(components, (component, key) => ({ component, key }))
      .filter(({ component }) => component.propTypes != null)
      .map(({ component, key }) => {
        const componentDeclaration =
          component instanceof React.Component
            ? `export class ${key} extends React.Component<${key}Props> { }`
            : `export const ${key}: React.StatelessComponent<${key}Props>;`;

        const interfaceDeclaration = `
          export interface ${key}Props {
            ${_.map(component.propTypes, (type, prop) => ({ type, prop }))
              .filter(({ prop }) => prop !== 'children')
              .map(
                ({ prop, type }) =>
                  `${prop}${type.required ? '' : '?'}: ${typeToString(type)}`
              )
              .join(';\n')}
          }
        `;

        return interfaceDeclaration + '\n' + componentDeclaration + '\n';
      })
      .join('\n')}
  }`;

  return typescriptFormatter
    .processString(outputPath, moduleStr, {
      indentSize: 2,
      tabSize: 2,
      convertTabsToSpaces: true
    })
    .then(output => {
      fs.writeFileSync(outputPath, output.dest);
    });
}

commander
  .version(require('./package.json').version)
  .arguments('<moduleName> <outputPath>')
  .action(extractTypes)
  .parse(process.argv);
