# TS PropType extractor

Extract ambient TypeScript declarations from components with proptypes.

## Usage

Install it:

```
$ yarn add ts-proptype-extractor
```

Use it:

```
$ npx ts-proptype-extractor some-component-library output.d.ts
```

The first argument is the name of the library you want to extract types from - this library
and any dependencies must be installed, as the tool will `require` it.

The second argument is the path to the output file.

The tool will iterate over every export, and if it has a `propTypes` property, it will
output a declaration for the component and an interface for the properties.

E.g., given the following component:

```js
const MyComponent = (props) => (<div className={props.className}>
  Good {props.time}, {props.name}!
</div>);

MyComponent.propTypes = {
  className: PropTypes.string
  time: PropTypes.oneOf(['morning', 'afternoon']).isRequired,
  name: PropTypes.string.isRequired
};
```

The following definition will be output:

```js
export interface MyComponentProps {
  className?: string;
  time: 'morning' | 'afternoon';
  name: string;
}

export const MyComponent: React.StatelessComponent<MyComponentProps>;
```

## Notes

I hacked this together in an hour for a specific use case, so there are probably a bunch
of things that don't work (yet). Pull requests are very much welcome.
