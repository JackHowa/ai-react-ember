const SimpleLogic = (props) => {
  const { myObject } = props;

  return <>{myObject.something ? <b>This Thing</b> : <b>That Thing</b>}</>;
};

export default SimpleLogic;
