const Instruction = (props) => {
  const { username } = props;
  return (
    <p className="contract-text">
      Please sign these silly React contracts, {username}
    </p>
  );
};

export default Instruction;
