const ComplexLogic = (props) => {
  const { myObject } = props;

  if (myObject.something) {
    return <b>This Thing</b>;
  } else if (myObject.thatThing === 'That Thing') {
    return <b>That Thing</b>;
  } else {
    return <b>{myObject.defaultThing}</b>;
  }
};

export default ComplexLogic;
