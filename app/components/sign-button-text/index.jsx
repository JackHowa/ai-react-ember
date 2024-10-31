const SignButtonText = (props) => {
  const { isSigned } = props;

  return (
    <>
      {isSigned ? (
        <p className="signature-text">Signed in blood... </p>
      ) : (
        <p className="signature-prompt">Sign here... if you dare.</p>
      )}
    </>
  );
};

export default SignButtonText;
