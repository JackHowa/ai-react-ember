const FixIcon = (props) => {
  const { isCritical } = props;
  return (
    <img
      alt={isCritical ? 'Critical Fix Icon' : 'Fix Icon'}
      className="fix-icon"
      src={
        isCritical
          ? '/assets/svgs/fix-icon-red.svg'
          : '/assets/svgs/fix-icon.svg'
      }
    />
  );
};

export default FixIcon;
