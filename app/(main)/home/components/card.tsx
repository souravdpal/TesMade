import MainCard from "./maincard";

const Card = () => {
  return (
    <div className="grid grid-cols-3 content-start gap-10 p-30">
      <MainCard
        title="Create test"
        discription="create test and give to students"
        link="/test/new?mode=tutor&console=panel"
      />
      <MainCard
        title="My Test"
        discription="Test for you by your tutor"
        link="/test/student/"
      />
      <MainCard
        title="AI test"
        discription="Practice with ai created test for revision"
        link="/test/new?mode=AI&console=hybrid"
      />
      <MainCard
        title="To do"
        discription="Practice with ai created test for revision"
        link="/study/todo?medium=root"
      />
      <MainCard
        title="Study dashboard"
        discription="Study with pomodoro and ai system monitoring your studies"
        link="/study"
      />
      <MainCard
        title="Analysis"
        discription="Analyze your mistakes, tests, goals, and study patterns"
        link="/stats?overview=true"
      />
      <MainCard
        title="Old test"
        discription="Old test history and pattern"
        link="/test?h=5"
      />
    </div>
  );
};

export default Card;